/*
# PHARMOS - Routine Medicine Totals

Stores the manually entered "Total Amount of Medicines" for a routine medicine entry.
The total is entered by the admin manually — no automatic calculation.

## Fields
- id — primary key
- customer_id — FK to customers
- membership_id — membership id text (same convention as routine_medicines)
- total_amount — manually entered total amount in ₹
- created_at — timestamp
*/

-- ===== ROUTINE MEDICINE TOTALS =====
CREATE TABLE IF NOT EXISTS routine_medicine_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id text NOT NULL,
  total_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routine_medicine_totals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_routine_med_totals" ON routine_medicine_totals;
CREATE POLICY "anon_select_routine_med_totals" ON routine_medicine_totals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_routine_med_totals" ON routine_medicine_totals;
CREATE POLICY "anon_insert_routine_med_totals" ON routine_medicine_totals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routine_med_totals" ON routine_medicine_totals;
CREATE POLICY "anon_update_routine_med_totals" ON routine_medicine_totals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routine_med_totals" ON routine_medicine_totals;
CREATE POLICY "anon_delete_routine_med_totals" ON routine_medicine_totals FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_routine_med_totals_customer ON routine_medicine_totals (customer_id);