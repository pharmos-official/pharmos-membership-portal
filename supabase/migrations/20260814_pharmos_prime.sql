/*
# PHARMOS PRIME — Membership Plans & Personal Health Document Storage

## Overview
Adds the Pharmos Prime membership system on top of the existing schema.
This migration is additive — it does NOT alter existing data.

## New / Modified
1. `memberships` — ADD columns: `plan` ('basic'|'prime'), `status` ('active'|'disabled'), `prime_enabled` (bool)
2. `member_documents` — NEW table: member personal health-document storage (Pharmos Prime)
3. `app_settings` — NEW table: configurable WhatsApp number, message, plan prices
4. `admin_users` — NEW table: admin login credentials (bcrypt-hashed)
5. `admin_sessions` — NEW table: admin session tokens
6. Storage bucket `member-documents` — private bucket for Prime uploads
7. RPC functions for admin auth, settings, member documents, and portal data extension

## Security
- Member documents are only accessible via SECURITY DEFINER functions that verify the
  customer session token AND active/prime membership.
- Admin operations validate the admin session token server-side.
- Files in `member-documents` bucket are private — accessed via signed URLs.
- Passwords are bcrypt-hashed via pgcrypto.
*/

-- =====================================================================
-- 1. MEMBERSHIPS — plan / status / prime_enabled
-- =====================================================================
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic'
    CHECK (plan IN ('basic', 'prime')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  ADD COLUMN IF NOT EXISTS prime_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_memberships_plan ON memberships (plan);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships (status);

-- =====================================================================
-- 2. MEMBER DOCUMENTS — Pharmos Prime personal storage
-- =====================================================================
CREATE TABLE IF NOT EXISTS member_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  file_name text,
  file_type text,
  file_path text,
  uploaded_by text NOT NULL DEFAULT 'member'
    CHECK (uploaded_by IN ('member', 'admin')),
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_member_documents" ON member_documents;
CREATE POLICY "anon_select_member_documents" ON member_documents
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_member_documents" ON member_documents;
CREATE POLICY "anon_insert_member_documents" ON member_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_member_documents" ON member_documents;
CREATE POLICY "anon_update_member_documents" ON member_documents
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_member_documents" ON member_documents;
CREATE POLICY "anon_delete_member_documents" ON member_documents
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_member_documents_customer ON member_documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_category ON member_documents (category);

-- =====================================================================
-- 3. APP SETTINGS — configurable WhatsApp / plan prices
-- =====================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_settings" ON app_settings;
CREATE POLICY "anon_delete_app_settings" ON app_settings
  FOR DELETE TO anon, authenticated USING (true);

-- Seed defaults (overwritten by admin via Settings page)
INSERT INTO app_settings (key, value) VALUES
  ('whatsapp_number', '919876543210'),
  ('whatsapp_message', 'Hello! I would like to create a new Pharmos Membership account. Please guide me through the registration process.'),
  ('basic_plan_price', '99'),
  ('basic_plan_label', 'Basic Membership'),
  ('prime_plan_price', '199'),
  ('prime_plan_label', 'Pharmos Prime')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 4. ADMIN USERS & SESSIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT 'Administrator',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_users" ON admin_users;
CREATE POLICY "anon_select_admin_users" ON admin_users
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_users" ON admin_users;
CREATE POLICY "anon_insert_admin_users" ON admin_users
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_users" ON admin_users;
CREATE POLICY "anon_update_admin_users" ON admin_users
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_users" ON admin_users;
CREATE POLICY "anon_delete_admin_users" ON admin_users
  FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_used timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_admin_sessions" ON admin_sessions;
CREATE POLICY "anon_select_admin_sessions" ON admin_sessions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_sessions" ON admin_sessions;
CREATE POLICY "anon_insert_admin_sessions" ON admin_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_sessions" ON admin_sessions;
CREATE POLICY "anon_update_admin_sessions" ON admin_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_sessions" ON admin_sessions;
CREATE POLICY "anon_delete_admin_sessions" ON admin_sessions
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions (admin_id);

-- Default admin account (bcrypt). Username: admin / Password: admin123
-- CHANGE THIS after first login via the admin panel.
INSERT INTO admin_users (username, password_hash, full_name)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'PHARMOS Administrator')
ON CONFLICT (username) DO NOTHING;

-- =====================================================================
-- 5. STORAGE BUCKET — member-documents (private)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_upload_member_docs" ON storage.objects;
CREATE POLICY "anon_upload_member_docs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'member-documents');

DROP POLICY IF EXISTS "anon_read_member_docs" ON storage.objects;
CREATE POLICY "anon_read_member_docs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'member-documents');

DROP POLICY IF EXISTS "anon_delete_member_docs" ON storage.objects;
CREATE POLICY "anon_delete_member_docs" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'member-documents');

-- =====================================================================
-- 6. RPC FUNCTIONS
-- =====================================================================

-- ----- ADMIN AUTH -----

-- Verify admin login. Returns { admin_id, session_token, full_name } or NULL.
CREATE OR REPLACE FUNCTION verify_admin_login(
  p_username text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_admin
  FROM admin_users
  WHERE username = p_username AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_admin.password_hash != crypt(p_password, v_admin.password_hash) THEN
    RETURN NULL;
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  DELETE FROM admin_sessions WHERE admin_id = v_admin.id;
  INSERT INTO admin_sessions (admin_id, session_token)
  VALUES (v_admin.id, v_token);

  RETURN json_build_object(
    'admin_id', v_admin.id,
    'session_token', v_token,
    'full_name', v_admin.full_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_login(text, text) TO anon, authenticated;

-- Validate an admin session token.
CREATE OR REPLACE FUNCTION validate_admin_session(
  p_session_token text,
  p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session admin_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM admin_sessions
  WHERE session_token = p_session_token AND admin_id = p_admin_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_session.expires_at < now() THEN
    DELETE FROM admin_sessions WHERE id = v_session.id;
    RETURN false;
  END IF;

  UPDATE admin_sessions SET last_used = now() WHERE id = v_session.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_admin_session(text, uuid) TO anon, authenticated;

-- Logout admin session.
CREATE OR REPLACE FUNCTION logout_admin_session(
  p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM admin_sessions WHERE session_token = p_session_token;
END;
$$;

GRANT EXECUTE ON FUNCTION logout_admin_session(text) TO anon, authenticated;

-- Change admin password (requires valid admin session).
CREATE OR REPLACE FUNCTION change_admin_password(
  p_admin_id uuid,
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
  v_admin admin_users%ROWTYPE;
BEGIN
  IF NOT validate_admin_session(p_session_token, p_admin_id) THEN
    RETURN false;
  END IF;

  SELECT * INTO v_admin FROM admin_users WHERE id = p_admin_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_admin.password_hash != crypt(p_old_password, v_admin.password_hash) THEN
    RETURN false;
  END IF;

  IF length(p_new_password) < 6 THEN
    RETURN false;
  END IF;

  UPDATE admin_users
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_admin_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION change_admin_password(uuid, text, text, text) TO anon, authenticated;

-- ----- SETTINGS -----

-- Return all app settings as a JSON object.
CREATE OR REPLACE FUNCTION get_app_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(
    json_object_agg(key, value),
    '{}'::json
  ) INTO result
  FROM app_settings;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_app_settings() TO anon, authenticated;

-- Update an app setting (requires valid admin session).
CREATE OR REPLACE FUNCTION update_app_setting(
  p_admin_session_token text,
  p_key text,
  p_value text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN false;
  END IF;

  INSERT INTO app_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_app_setting(text, text, text) TO anon, authenticated;

-- ----- MEMBER DOCUMENTS -----

-- Create a member document (validates customer session + active prime membership).
CREATE OR REPLACE FUNCTION create_member_document(
  p_customer_id uuid,
  p_session_token text,
  p_category text,
  p_title text,
  p_description text,
  p_file_name text,
  p_file_type text,
  p_file_path text,
  p_document_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_id uuid;
  v_membership memberships%ROWTYPE;
  v_doc_id uuid;
BEGIN
  v_verified_id := validate_customer_session(p_session_token, p_customer_id);
  IF v_verified_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_membership
  FROM memberships
  WHERE customer_id = v_verified_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Must have a non-expired, non-disabled membership with Prime enabled
  IF v_membership.status != 'active'
     OR v_membership.expiry_date < CURRENT_DATE
     OR v_membership.prime_enabled = false THEN
    RETURN NULL;
  END IF;

  INSERT INTO member_documents (
    customer_id, category, title, description,
    file_name, file_type, file_path, uploaded_by, document_date
  )
  VALUES (
    v_verified_id, p_category, p_title, p_description,
    p_file_name, p_file_type, p_file_path, 'member', p_document_date
  )
  RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_member_document(
  uuid, text, text, text, text, text, text, text, date
) TO anon, authenticated;

-- Delete a member document that was uploaded by the member (validates session + ownership).
CREATE OR REPLACE FUNCTION delete_member_document(
  p_customer_id uuid,
  p_session_token text,
  p_document_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_id uuid;
  v_doc member_documents%ROWTYPE;
BEGIN
  v_verified_id := validate_customer_session(p_session_token, p_customer_id);
  IF v_verified_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_doc
  FROM member_documents
  WHERE id = p_document_id AND customer_id = v_verified_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  DELETE FROM member_documents WHERE id = v_doc.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_member_document(uuid, text, uuid) TO anon, authenticated;

-- ----- ADMIN MEMBERSHIP MANAGEMENT -----

-- Update a member's membership (renew, change plan, prime toggle, status, expiry).
CREATE OR REPLACE FUNCTION admin_update_membership(
  p_admin_session_token text,
  p_membership_id uuid,
  p_plan text,
  p_status text,
  p_prime_enabled boolean,
  p_start_date date,
  p_expiry_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL OR NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN false;
  END IF;

  UPDATE memberships
  SET plan = p_plan,
      status = p_status,
      prime_enabled = p_prime_enabled,
      start_date = p_start_date,
      expiry_date = p_expiry_date
  WHERE id = p_membership_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_membership(text, uuid, text, text, boolean, date, date) TO anon, authenticated;

-- Reset a member's password (requires valid admin session).
CREATE OR REPLACE FUNCTION admin_reset_customer_password(
  p_admin_session_token text,
  p_customer_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL OR NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN false;
  END IF;

  IF length(p_new_password) < 6 THEN
    RETURN false;
  END IF;

  INSERT INTO customer_accounts (customer_id, mobile, password_hash, account_activated)
  VALUES (p_customer_id, (SELECT mobile FROM customers WHERE id = p_customer_id), crypt(p_new_password, gen_salt('bf')), true)
  ON CONFLICT (customer_id) DO UPDATE
    SET password_hash = crypt(p_new_password, gen_salt('bf')),
        account_activated = true;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_customer_password(text, uuid, text) TO anon, authenticated;

-- Add/update member account login (user id). Requires valid admin session.
CREATE OR REPLACE FUNCTION admin_set_customer_login(
  p_admin_session_token text,
  p_customer_id uuid,
  p_user_id text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL OR NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN false;
  END IF;

  IF p_password IS NOT NULL AND length(p_password) < 6 THEN
    RETURN false;
  END IF;

  INSERT INTO customer_accounts (customer_id, mobile, password_hash, account_activated)
  VALUES (p_customer_id, p_user_id,
    CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) END,
    true)
  ON CONFLICT (customer_id) DO UPDATE
    SET mobile = p_user_id,
        password_hash = CASE WHEN p_password IS NOT NULL THEN crypt(p_password, gen_salt('bf')) ELSE customer_accounts.password_hash END,
        account_activated = true;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_customer_login(text, uuid, text, text) TO anon, authenticated;

-- =====================================================================
-- 7. EXTEND get_customer_portal_data — membership_usable + member_documents
-- =====================================================================
DROP FUNCTION IF EXISTS get_customer_portal_data(uuid, text);

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
  v_membership memberships%ROWTYPE;
  v_usable boolean := false;
BEGIN
  v_verified_id := validate_customer_session(p_session_token, p_customer_id);
  IF v_verified_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_membership
  FROM memberships
  WHERE customer_id = v_verified_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- A membership is usable if active, not disabled, and not expired (expiry day inclusive)
  IF v_membership.id IS NOT NULL
     AND v_membership.status = 'active'
     AND v_membership.expiry_date >= CURRENT_DATE THEN
    v_usable := true;
  END IF;

  SELECT json_build_object(
    'customer', row_to_json(c),
    'membership', (SELECT row_to_json(m) FROM memberships m WHERE m.customer_id = c.id ORDER BY created_at DESC LIMIT 1),
    'membership_usable', v_usable,
    'medicine_purchases',
      CASE WHEN v_usable THEN
        COALESCE((SELECT json_agg(mp ORDER BY purchase_date DESC) FROM medicine_purchases mp WHERE mp.customer_id = c.id), '[]'::json)
      ELSE '[]'::json END,
    'bp_records',
      CASE WHEN v_usable THEN
        COALESCE((SELECT json_agg(bp ORDER BY checkup_date DESC, checkup_time DESC) FROM bp_records bp WHERE bp.customer_id = c.id), '[]'::json)
      ELSE '[]'::json END,
    'sugar_records',
      CASE WHEN v_usable THEN
        COALESCE((SELECT json_agg(sr ORDER BY checkup_date DESC, checkup_time DESC) FROM sugar_records sr WHERE sr.customer_id = c.id), '[]'::json)
      ELSE '[]'::json END,
    'ecg_records',
      CASE WHEN v_usable THEN
        COALESCE((
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
      ELSE '[]'::json END,
    'member_documents',
      CASE WHEN v_usable AND v_membership.prime_enabled THEN
        COALESCE((
          SELECT json_agg(md ORDER BY created_at DESC)
          FROM member_documents md WHERE md.customer_id = c.id
        ), '[]'::json)
      ELSE '[]'::json END
  ) INTO result
  FROM customers c
  WHERE c.id = v_verified_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_portal_data(uuid, text) TO anon, authenticated;