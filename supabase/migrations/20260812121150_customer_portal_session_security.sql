/*
# Customer Portal Session Security

## Overview
Adds a session token mechanism for the customer portal. When a customer logs in,
a random session token is generated and stored. The portal data function verifies
this token before returning any customer data — preventing one customer from
accessing another's data by guessing customer IDs.

## New Tables
- `customer_sessions`
  - `id` (uuid, PK)
  - `customer_id` (uuid, FK → customers.id)
  - `session_token` (text, unique) — random 64-char hex token
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz) — 30 days from creation
  - `last_used` (timestamptz)

## Modified Functions
- `verify_customer_login` — now returns json { customer_id, session_token, customer_name } instead of uuid
- `activate_customer_account` — now returns json { customer_id, session_token, customer_name }
- `get_customer_portal_data` — now requires session token parameter, validates before returning data
- `change_customer_password` — now requires session token parameter

## New Functions
- `generate_session_token()` — generates a random 64-char hex token
- `validate_customer_session(token, customer_id)` — validates session, returns customer_id or NULL
- `logout_customer_session(token)` — deletes a session

## Security
- RLS enabled on customer_sessions (anon can manage sessions for the portal flow)
- Session tokens are 32 random bytes hex-encoded (64 chars) via pgcrypto
- Sessions expire after 30 days
- Portal data function checks that the session token belongs to the requested customer_id

## Important Notes
1. Does NOT alter existing tables or data.
2. Admin panel continues to work unchanged.
3. pgcrypto is installed in the `extensions` schema — functions are schema-qualified.
*/

-- ===== SESSIONS TABLE =====
CREATE TABLE IF NOT EXISTS customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_used timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON customer_sessions;
CREATE POLICY "anon_select_sessions" ON customer_sessions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON customer_sessions;
CREATE POLICY "anon_insert_sessions" ON customer_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON customer_sessions;
CREATE POLICY "anon_update_sessions" ON customer_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON customer_sessions;
CREATE POLICY "anon_delete_sessions" ON customer_sessions
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON customer_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON customer_sessions (customer_id);

-- ===== HELPER: generate session token =====
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT extensions.gen_random_bytes(32);
$$;

-- Return the hex string directly (gen_random_bytes returns bytea, encode converts)
-- Actually gen_random_bytes returns bytea; we need encode to get hex
-- Let's fix: use a plpgsql function instead

DROP FUNCTION IF EXISTS generate_session_token();

CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION generate_session_token() TO anon, authenticated;

-- ===== HELPER: validate session =====
CREATE OR REPLACE FUNCTION validate_customer_session(
  p_session_token text,
  p_customer_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session customer_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM customer_sessions
  WHERE session_token = p_session_token AND customer_id = p_customer_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_session.expires_at < now() THEN
    DELETE FROM customer_sessions WHERE id = v_session.id;
    RETURN NULL;
  END IF;

  UPDATE customer_sessions SET last_used = now() WHERE id = v_session.id;
  RETURN v_session.customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_customer_session(text, uuid) TO anon, authenticated;

-- ===== UPDATE: verify_customer_login =====
-- Now returns json: { customer_id, session_token, customer_name } or NULL
DROP FUNCTION IF EXISTS verify_customer_login(text, text);

CREATE OR REPLACE FUNCTION verify_customer_login(
  p_mobile text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_account customer_accounts%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_account
  FROM customer_accounts
  WHERE mobile = p_mobile AND account_activated = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_account.password_hash != crypt(p_password, v_account.password_hash) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_account.customer_id LIMIT 1;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  DELETE FROM customer_sessions WHERE customer_id = v_account.customer_id;

  INSERT INTO customer_sessions (customer_id, session_token)
  VALUES (v_account.customer_id, v_token);

  UPDATE customer_accounts SET last_login = now() WHERE id = v_account.id;

  RETURN json_build_object(
    'customer_id', v_account.customer_id,
    'session_token', v_token,
    'customer_name', v_customer.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_customer_login(text, text) TO anon, authenticated;

-- ===== UPDATE: activate_customer_account =====
-- Now returns json: { customer_id, session_token, customer_name } or NULL
DROP FUNCTION IF EXISTS activate_customer_account(text, text, text);

CREATE OR REPLACE FUNCTION activate_customer_account(
  p_mobile text,
  p_membership_id text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_existing customer_accounts%ROWTYPE;
  v_token text;
BEGIN
  SELECT c.* INTO v_customer
  FROM customers c
  JOIN memberships m ON m.customer_id = c.id
  WHERE c.mobile = p_mobile AND m.membership_id = p_membership_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_existing FROM customer_accounts WHERE customer_id = v_customer.id;
  IF FOUND AND v_existing.account_activated = true THEN
    RAISE EXCEPTION 'Account already activated. Please login with your mobile number and password.';
  END IF;

  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF FOUND THEN
    UPDATE customer_accounts
    SET password_hash = crypt(p_password, gen_salt('bf')),
        account_activated = true
    WHERE customer_id = v_customer.id;
  ELSE
    INSERT INTO customer_accounts (customer_id, mobile, password_hash, account_activated)
    VALUES (v_customer.id, p_mobile, crypt(p_password, gen_salt('bf')), true);
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  DELETE FROM customer_sessions WHERE customer_id = v_customer.id;

  INSERT INTO customer_sessions (customer_id, session_token)
  VALUES (v_customer.id, v_token);

  RETURN json_build_object(
    'customer_id', v_customer.id,
    'session_token', v_token,
    'customer_name', v_customer.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION activate_customer_account(text, text, text) TO anon, authenticated;

-- ===== UPDATE: get_customer_portal_data =====
-- Now requires session token for verification
DROP FUNCTION IF EXISTS get_customer_portal_data(uuid);

CREATE OR REPLACE FUNCTION get_customer_portal_data(
  p_customer_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_id uuid;
  result json;
BEGIN
  v_verified_id := validate_customer_session(p_session_token, p_customer_id);
  IF v_verified_id IS NULL THEN
    RETURN NULL;
  END IF;

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
  WHERE c.id = v_verified_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_portal_data(uuid, text) TO anon, authenticated;

-- ===== UPDATE: change_customer_password =====
-- Now requires session token for verification
DROP FUNCTION IF EXISTS change_customer_password(uuid, text, text);

CREATE OR REPLACE FUNCTION change_customer_password(
  p_customer_id uuid,
  p_session_token text,
  p_old_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_id uuid;
  v_account customer_accounts%ROWTYPE;
BEGIN
  v_verified_id := validate_customer_session(p_session_token, p_customer_id);
  IF v_verified_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_account
  FROM customer_accounts
  WHERE customer_id = v_verified_id AND account_activated = true
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

GRANT EXECUTE ON FUNCTION change_customer_password(uuid, text, text, text) TO anon, authenticated;

-- ===== LOGOUT FUNCTION =====
CREATE OR REPLACE FUNCTION logout_customer_session(
  p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM customer_sessions WHERE session_token = p_session_token;
END;
$$;

GRANT EXECUTE ON FUNCTION logout_customer_session(text) TO anon, authenticated;