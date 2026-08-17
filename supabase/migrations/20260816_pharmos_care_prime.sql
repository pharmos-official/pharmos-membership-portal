/*
# PHARMOS Care & Prime — Plan Naming & Customer Data Permissions

## Overview
This migration enforces customer-side permissions for Pharmos Prime documents
and renames the ₹99 plan to "Pharmos Care" in the database defaults.

## Changes
1. `delete_member_document` — now requires `uploaded_by = 'member'` so customers
   can only delete their own uploaded documents, not admin-uploaded ones.
2. `update_member_document` — new SECURITY DEFINER function that allows customers
   to edit only their own uploaded documents (category, title, description, date).
3. `app_settings` seed values updated: `basic_plan_label` = 'Pharmos Care'.
*/

-- =====================================================================
-- 1. UPDATE delete_member_document — only member-uploaded docs
-- =====================================================================
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
  WHERE id = p_document_id
    AND customer_id = v_verified_id
    AND uploaded_by = 'member'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  DELETE FROM member_documents WHERE id = v_doc.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_member_document(uuid, text, uuid) TO anon, authenticated;

-- =====================================================================
-- 2. UPDATE member_document — only member-uploaded docs
-- =====================================================================
CREATE OR REPLACE FUNCTION update_member_document(
  p_customer_id uuid,
  p_session_token text,
  p_document_id uuid,
  p_category text,
  p_title text,
  p_description text,
  p_document_date date
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
  WHERE id = p_document_id
    AND customer_id = v_verified_id
    AND uploaded_by = 'member'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE member_documents
  SET category = p_category,
      title = p_title,
      description = p_description,
      document_date = p_document_date
  WHERE id = v_doc.id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_member_document(uuid, text, uuid, text, text, text, date) TO anon, authenticated;

-- =====================================================================
-- 3. UPDATE app_settings seed — rename Basic to Pharmos Care
-- =====================================================================
UPDATE app_settings SET value = 'Pharmos Care' WHERE key = 'basic_plan_label' AND value = 'Basic Membership';
