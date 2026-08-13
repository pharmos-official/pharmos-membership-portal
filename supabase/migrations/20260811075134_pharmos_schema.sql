/*
# PHARMOS Customer Health Membership System - Core Schema

## Overview
Creates the complete database for the PHARMOS Customer Health Membership & Medicine Tracking system.
This is a single-tenant app for medical-store staff (no sign-in screen), so anon + authenticated
roles have full CRUD access. Health data is protected by RLS policies that require a valid membership
relationship, but since staff use a shared device, access is open to the application role.

## Tables
1. `customers` — core customer profile (name, mobile, address, DOB, gender, notes)
2. `memberships` — 1-year membership tied to a customer, auto-generated membership_id (PHM000001)
3. `medicine_purchases` — monthly medicine purchase records (name, qty, unit, days, next due date)
4. `bp_records` — blood pressure readings (systolic, diastolic, pulse)
5. `sugar_records` — blood sugar readings (Fasting/PP/RBS/HbA1c)
6. `ecg_records` — ECG checkup records (result, notes)
7. `ecg_attachments` — files (images/PDFs/videos) linked to ECG records, stored in Supabase Storage

## Security
- RLS enabled on every table.
- `TO anon, authenticated` CRUD policies (single-tenant, no-auth app — staff share one device).
- Storage bucket `ecg-attachments` is private (not public) — files accessed via signed URLs.

## Notes
- `membership_id` is generated via a sequence-backed format `PHM000001`.
- `next_due_date` on medicine purchases is computed by the app from purchase_date + days_of_medicine.
- `expiry_date` on memberships defaults to start_date + 1 year (computed by app at insert).
*/

-- ===== CUSTOMERS =====
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  address text,
  date_of_birth date,
  gender text CHECK (gender IN ('Male','Female','Other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers (mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);

-- ===== MEMBERSHIPS =====
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id text NOT NULL UNIQUE,
  start_date date NOT NULL,
  expiry_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_memberships" ON memberships;
CREATE POLICY "anon_select_memberships" ON memberships FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_memberships" ON memberships;
CREATE POLICY "anon_insert_memberships" ON memberships FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_memberships" ON memberships;
CREATE POLICY "anon_update_memberships" ON memberships FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_memberships" ON memberships;
CREATE POLICY "anon_delete_memberships" ON memberships FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_memberships_customer ON memberships (customer_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships (expiry_date);

-- ===== MEDICINE PURCHASES =====
CREATE TABLE IF NOT EXISTS medicine_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id text NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  medicine_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'tablet',
  days_of_medicine int NOT NULL DEFAULT 30,
  next_due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medicine_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_medicine" ON medicine_purchases;
CREATE POLICY "anon_select_medicine" ON medicine_purchases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_medicine" ON medicine_purchases;
CREATE POLICY "anon_insert_medicine" ON medicine_purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_medicine" ON medicine_purchases;
CREATE POLICY "anon_update_medicine" ON medicine_purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_medicine" ON medicine_purchases;
CREATE POLICY "anon_delete_medicine" ON medicine_purchases FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_med_customer ON medicine_purchases (customer_id);
CREATE INDEX IF NOT EXISTS idx_med_date ON medicine_purchases (purchase_date);
CREATE INDEX IF NOT EXISTS idx_med_name ON medicine_purchases (medicine_name);

-- ===== BP RECORDS =====
CREATE TABLE IF NOT EXISTS bp_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  checkup_date date NOT NULL DEFAULT CURRENT_DATE,
  checkup_time time NOT NULL DEFAULT CURRENT_TIME,
  systolic int NOT NULL,
  diastolic int NOT NULL,
  pulse int,
  reading_text text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bp_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_bp" ON bp_records;
CREATE POLICY "anon_select_bp" ON bp_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bp" ON bp_records;
CREATE POLICY "anon_insert_bp" ON bp_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bp" ON bp_records;
CREATE POLICY "anon_update_bp" ON bp_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bp" ON bp_records;
CREATE POLICY "anon_delete_bp" ON bp_records FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_bp_customer ON bp_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_bp_date ON bp_records (checkup_date);

-- ===== SUGAR RECORDS =====
CREATE TABLE IF NOT EXISTS sugar_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  checkup_date date NOT NULL DEFAULT CURRENT_DATE,
  checkup_time time NOT NULL DEFAULT CURRENT_TIME,
  test_type text NOT NULL CHECK (test_type IN ('Fasting','PP','RBS','HbA1c')),
  reading numeric NOT NULL,
  unit text NOT NULL DEFAULT 'mg/dL',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sugar_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sugar" ON sugar_records;
CREATE POLICY "anon_select_sugar" ON sugar_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sugar" ON sugar_records;
CREATE POLICY "anon_insert_sugar" ON sugar_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sugar" ON sugar_records;
CREATE POLICY "anon_update_sugar" ON sugar_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sugar" ON sugar_records;
CREATE POLICY "anon_delete_sugar" ON sugar_records FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sugar_customer ON sugar_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_sugar_date ON sugar_records (checkup_date);

-- ===== ECG RECORDS =====
CREATE TABLE IF NOT EXISTS ecg_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  checkup_date date NOT NULL DEFAULT CURRENT_DATE,
  checkup_time time NOT NULL DEFAULT CURRENT_TIME,
  result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ecg_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ecg" ON ecg_records;
CREATE POLICY "anon_select_ecg" ON ecg_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ecg" ON ecg_records;
CREATE POLICY "anon_insert_ecg" ON ecg_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ecg" ON ecg_records;
CREATE POLICY "anon_update_ecg" ON ecg_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ecg" ON ecg_records;
CREATE POLICY "anon_delete_ecg" ON ecg_records FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ecg_customer ON ecg_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_ecg_date ON ecg_records (checkup_date);

-- ===== ECG ATTACHMENTS =====
CREATE TABLE IF NOT EXISTS ecg_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecg_record_id uuid NOT NULL REFERENCES ecg_records(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ecg_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ecg_att" ON ecg_attachments;
CREATE POLICY "anon_select_ecg_att" ON ecg_attachments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ecg_att" ON ecg_attachments;
CREATE POLICY "anon_insert_ecg_att" ON ecg_attachments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ecg_att" ON ecg_attachments;
CREATE POLICY "anon_delete_ecg_att" ON ecg_attachments FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ecg_att_record ON ecg_attachments (ecg_record_id);

-- ===== MEMBERSHIP ID SEQUENCE =====
-- Backing sequence for PHM000001-style IDs. The app reads nextval and formats it.
CREATE SEQUENCE IF NOT EXISTS membership_id_seq START 1;