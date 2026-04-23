-- Add 'internal_note' to employee_timeline event_type CHECK constraint
ALTER TABLE employee_timeline
  DROP CONSTRAINT employee_timeline_event_type_check;

ALTER TABLE employee_timeline
  ADD CONSTRAINT employee_timeline_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'hired', 'promoted', 'demoted', 'transfer_outlet', 'transfer_entity',
    'salary_change', 'contract_renewed', 'contract_changed',
    'warning_sp1', 'warning_sp2', 'warning_sp3',
    'performance_review', 'kpi_set', 'kpi_reviewed',
    'leave_approved', 'leave_rejected', 'document_given',
    'training_completed', 'resignation', 'termination',
    'note', 'internal_note'
  ]));

-- Also ensure anon role can INSERT and SELECT on employee_timeline
-- (needed for client-side saves from HRD dashboard which uses anon key)
ALTER TABLE employee_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon full access on employee_timeline" ON employee_timeline;
CREATE POLICY "Allow anon full access on employee_timeline"
ON employee_timeline FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access on employee_timeline" ON employee_timeline;
CREATE POLICY "Allow authenticated full access on employee_timeline"
ON employee_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);
