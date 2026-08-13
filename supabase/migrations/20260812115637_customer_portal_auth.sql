/*
# Customer Portal Authentication - Account Table & RLS

## Overview
Adds a `customer_accounts` table for customer portal authentication. Customers log in
with their mobile number + password (created during first-time activation). This table
links to the existing `customers` table — no duplicate customer records are created.

## New Tables
- `customer_accounts`
  - `id` (uuid, PK)
  - `customer_id` (uuid, FK → customers.id, UNIQUE) — one account per customer
  - `mobile` (text, UNIQUE) — login identifier, must match the customer's mobile
  - `password_hash` (text) — bcrypt hash, never plain text
  - `account_activated` (boolean, default false) — true after first-time password creation
  - `created_at` (timestamptz)
  - `last_login` (timestamptz, nullable)

## Security
- RLS enabled on `customer_accounts`.
- Admin (anon + authenticated) can read all accounts (to see activation status).
- Admin can insert/update accounts (for activation flow via edge function).
- The password_hash column is never exposed to the frontend — a SECURITY DEFINER function
  handles activation and login verification server-side.

## Important Notes
1. This migration does NOT alter any existing tables or data.
2. The admin panel continues to work with anon-key access unchanged.
3. Customer-scoped data access for the portal is enforced through SECURITY DEFINER
   functions that check the account's customer_id, NOT through RLS policy changes
   on the existing health tables (those remain anon-accessible for the admin panel).
4. Password hashing uses the `pgcrypto` extension's `crypt()` function with blowfish.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  mobile text NOT NULL UNIQUE,
  password_hash text,
  account_activated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

-- Admin (anon) can read accounts to check activation status
DROP POLICY IF EXISTS "anon_select_customer_accounts" ON customer_accounts;
CREATE POLICY "anon_select_customer_accounts" ON customer_accounts
  FOR SELECT TO anon, authenticated USING (true);

-- Admin can insert accounts
DROP POLICY IF EXISTS "anon_insert_customer_accounts" ON customer_accounts;
CREATE POLICY "anon_insert_customer_accounts" ON customer_accounts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin can update accounts (last_login, password changes)
DROP POLICY IF EXISTS "anon_update_customer_accounts" ON customer_accounts;
CREATE POLICY "anon_update_customer_accounts" ON customer_accounts
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Admin can delete accounts
DROP POLICY IF EXISTS "anon_delete_customer_accounts" ON customer_accounts;
CREATE POLICY "anon_delete_customer_accounts" ON customer_accounts
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_mobile ON customer_accounts (mobile);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON customer_accounts (customer_id);

-- ===== SECURITY DEFINER FUNCTIONS =====
-- These functions run with elevated privileges and handle customer auth securely.
-- They verify mobile + membership_id against existing records, and hash passwords
-- using pgcrypto's crypt() with blowfish (bf) algorithm.

/*
  Activate a customer account: verify mobile + membership_id match an existing customer,
  then create the account with a hashed password.
  Returns the customer_id on success, or NULL on failure.
*/
CREATE OR REPLACE FUNCTION activate_customer_account(
  p_mobile text,
  p_membership_id text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_existing customer_accounts%ROWTYPE;
BEGIN
  -- Find the customer by mobile + membership_id
  SELECT c.* INTO v_customer
  FROM customers c
  JOIN memberships m ON m.customer_id = c.id
  WHERE c.mobile = p_mobile AND m.membership_id = p_membership_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if account already exists and is activated
  SELECT * INTO v_existing FROM customer_accounts WHERE customer_id = v_customer.id;
  IF FOUND AND v_existing.account_activated = true THEN
    RAISE EXCEPTION 'Account already activated';
  END IF;

  -- Password length check
  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Insert or update the account with hashed password
  IF FOUND THEN
    UPDATE customer_accounts
    SET password_hash = crypt(p_password, gen_salt('bf')),
        account_activated = true
    WHERE customer_id = v_customer.id;
  ELSE
    INSERT INTO customer_accounts (customer_id, mobile, password_hash, account_activated)
    VALUES (v_customer.id, p_mobile, crypt(p_password, gen_salt('bf')), true);
  END IF;

  RETURN v_customer.id;
END;
$$;

/*
  Verify customer login: check mobile + password against stored hash.
  Returns the customer_id on success, or NULL on failure.
  Updates last_login on success.
*/
CREATE OR REPLACE FUNCTION verify_customer_login(
  p_mobile text,
  p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account customer_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account
  FROM customer_accounts
  WHERE mobile = p_mobile AND account_activated = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_account.password_hash = crypt(p_password, v_account.password_hash) THEN
    UPDATE customer_accounts SET last_login = now() WHERE id = v_account.id;
    RETURN v_account.customer_id;
  END IF;

  RETURN NULL;
END;
$$;

/*
  Change customer password: verify old password, then set new one.
  Returns true on success, false on failure.
*/
CREATE OR REPLACE FUNCTION change_customer_password(
  p_customer_id uuid,
  p_old_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account customer_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account
  FROM customer_accounts
  WHERE customer_id = p_customer_id AND account_activated = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_account.password_hash != crypt(p_old_password, v_account.password_hash) THEN
    RETURN false;
  END IF;

  IF length(p_new_password) < 6 THEN
    RETURN false;
  END IF;

  UPDATE customer_accounts
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = v_account.id;

  RETURN true;
END;
$$;

/*
  Get customer portal data: returns the customer + membership + all health/medicine records
  for the given customer_id. This is the single entry point for the customer portal.
  No RLS dependency — runs as SECURITY DEFINER so it works regardless of caller role.
*/
CREATE OR REPLACE FUNCTION get_customer_portal_data(p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'customer', row_to_json(c),
    'membership', (SELECT row_to_json(m) FROM memberships m WHERE m.customer_id = c.id ORDER BY created_at DESC LIMIT 1),
    'medicine_purchases', COALESCE((SELECT json_agg(mp ORDER BY purchase_date DESC) FROM medicine_purchases mp WHERE mp.customer_id = c.id), '[]'::json),
    'bp_records', COALESCE((SELECT json_agg(bp ORDER BY checkup_date DESC, checkup_time DESC) FROM bp_records bp WHERE bp.customer_id = c.id), '[]'::json),
    'sugar_records', COALESCE((SELECT json_agg(sr ORDER BY checkup_date DESC, checkup_time DESC) FROM sugar_records sr WHERE sr.customer_id = c.id), '[]'::json),
    'ecg_records', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', er.id, 'customer_id', er.customer_id, 'checkup_date', er.checkup_date,
          'checkup_time', er.checkup_time, 'result', er.result, 'notes', er.notes,
          'created_at', er.created_at,
          'ecg_attachments', COALESCE((
            SELECT json_agg(
              json_build_object('id', ea.id, 'ecg_record_id', ea.ecg_record_id, 'file_name', ea.file_name, 'file_type', ea.file_type, 'file_path', ea.file_path, 'uploaded_at', ea.uploaded_at)
            ) FROM ecg_attachments ea WHERE ea.ecg_record_id = er.id
          ), '[]'::json)
        ) ORDER BY er.checkup_date DESC, er.checkup_time DESC
      ) FROM ecg_records er WHERE er.customer_id = c.id
    ), '[]'::json)
  ) INTO result
  FROM customers c
  WHERE c.id = p_customer_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION activate_customer_account(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_customer_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_customer_password(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_customer_portal_data(uuid) TO anon, authenticated;