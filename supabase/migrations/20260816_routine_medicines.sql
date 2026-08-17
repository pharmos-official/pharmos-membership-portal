/*
# PHARMOS - Routine Medicines Table

Separate table for routine medicines so they do NOT appear in Medicine History.
Routine medicines are the customer's ongoing/regular medicines (name, qty, unit, note),
kept distinct from one-time medicine purchases in `medicine_purchases`.

## Fields
- id — primary key
- customer_id — FK to customers
- membership_id — membership id text (same convention as medicine_purchases)
- medicine_name — name of the medicine
- quantity — numeric quantity
- unit — unit (tablet, capsule, bottle, strip, box, ml, unit)
- notes — optional note (e.g. BP, Sugar)
- created_at — timestamp
*/

-- ===== ROUTINE MEDICINES =====
CREATE TABLE IF NOT EXISTS routine_medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  membership_id text NOT NULL,
  medicine_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'tablet',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routine_medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_routine_med" ON routine_medicines;
CREATE POLICY "anon_select_routine_med" ON routine_medicines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_routine_med" ON routine_medicines;
CREATE POLICY "anon_insert_routine_med" ON routine_medicines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_routine_med" ON routine_medicines;
CREATE POLICY "anon_update_routine_med" ON routine_medicines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_routine_med" ON routine_medicines;
CREATE POLICY "anon_delete_routine_med" ON routine_medicines FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_routine_med_customer ON routine_medicines (customer_id);
CREATE INDEX IF NOT EXISTS idx_routine_med_name ON routine_medicines (medicine_name);