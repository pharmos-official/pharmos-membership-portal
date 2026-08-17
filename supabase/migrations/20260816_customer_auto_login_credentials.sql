/*
# Customer Auto-Generated Login Credentials
#
## Overview
Adds a SECURITY DEFINER function for the admin panel that automatically creates
a customer account with:
- User ID  = customer's registered mobile number
- Password = customer's first name (from the full name)
#
This replaces the broken `admin_set_customer_login` flow in AddCustomer.tsx
which passed an empty admin session token and enforced a 6-char password
minimum (blocking short first names like "Amit").
#
## Changes
1. `admin_create_customer_login` — new SECURITY DEFINER function that validates
   the admin session, then creates/updates the customer_accounts row using
   mobile as user ID and first name as password. Returns the credentials JSON
   so the admin UI can display them.
#
## Security
- Requires a valid admin session token (validated server-side).
- Password is bcrypt-hashed via pgcrypto — never stored in plain text.
- Mobile is the unique login identifier (matches customer's registered mobile).
*/

-- =====================================================================
-- ADMIN: Create/Update customer login automatically
-- User ID = customer's mobile number
-- Password = customer's first name (derived from full name)
-- Returns JSON: { user_id, password, customer_name } or NULL on failure.
-- =====================================================================
CREATE OR REPLACE FUNCTION admin_create_customer_login(
  p_admin_session_token text,
  p_customer_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_id uuid;
  v_customer customers%ROWTYPE;
  v_first_name text;
  v_password text;
BEGIN
  -- Validate admin session
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL OR NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN NULL;
  END IF;

  -- Fetch the customer
  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Derive first name = first token of the customer's full name
  v_first_name := split_part(trim(v_customer.name), ' ', 1);
  v_password := v_first_name;

  -- If first name is empty, fall back to "member"
  IF length(v_password) < 1 THEN
    v_password := 'member';
  END IF;

  -- Create or update the customer account (no 6-char minimum, since
  -- short first names like "Amit" are valid passwords)
  INSERT INTO customer_accounts (customer_id, mobile, password_hash, account_activated)
  VALUES (v_customer.id, v_customer.mobile, crypt(v_password, gen_salt('bf')), true)
  ON CONFLICT (customer_id) DO UPDATE
    SET mobile = EXCLUDED.mobile,
        password_hash = crypt(v_password, gen_salt('bf')),
        account_activated = true;

  -- Also deactivate any stale sessions so the new password takes effect
  DELETE FROM customer_sessions WHERE customer_id = v_customer.id;

  RETURN json_build_object(
    'user_id', v_customer.mobile,
    'password', v_password,
    'customer_name', v_customer.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_customer_login(text, uuid) TO anon, authenticated;

-- =====================================================================
-- 2. ADMIN: Create a member document (uploaded_by = 'admin')
-- Requires a valid admin session. Returns the new document id.
-- =====================================================================
CREATE OR REPLACE FUNCTION admin_create_member_document(
  p_admin_session_token text,
  p_customer_id uuid,
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
  v_admin_id uuid;
  v_doc_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id
  FROM admin_sessions
  WHERE session_token = p_admin_session_token
  LIMIT 1;

  IF v_admin_id IS NULL OR NOT validate_admin_session(p_admin_session_token, v_admin_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO member_documents (
    customer_id, category, title, description,
    file_name, file_type, file_path, uploaded_by, document_date
  )
  VALUES (
    p_customer_id, p_category, p_title, p_description,
    p_file_name, p_file_type, p_file_path, 'admin', p_document_date
  )
  RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_member_document(text, uuid, text, text, text, text, text, text, date) TO anon, authenticated;

-- =====================================================================
-- 3. STORAGE-LEVEL ENFORCEMENT
-- Admin uploads go under `<customer_id>/admin/` — members/anon cannot
-- delete files in that folder.
-- =====================================================================
DROP POLICY IF EXISTS "anon_delete_member_docs" ON storage.objects;

CREATE POLICY "anon_delete_member_docs" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (
    bucket_id = 'member-documents'
    AND NOT (name LIKE '%/admin/%')
  );
