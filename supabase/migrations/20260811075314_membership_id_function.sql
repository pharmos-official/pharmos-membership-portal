/*
# Membership ID generation function

Creates a SECURITY DEFINER function `next_membership_id()` that atomically returns the next
value from the `membership_id_seq` sequence. The frontend formats it as PHM000001.
This is callable by anon + authenticated (single-tenant staff app).
*/

CREATE OR REPLACE FUNCTION next_membership_id()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('membership_id_seq');
$$;

GRANT EXECUTE ON FUNCTION next_membership_id() TO anon, authenticated;