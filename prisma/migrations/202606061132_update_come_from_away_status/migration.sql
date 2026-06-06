UPDATE "IpProperty"
SET
  "status" = 'IN_CONVERSATION',
  "meetingNotes" = 'June 3: Meeting with David Hein and Irene Sankoff.',
  "lastContactAt" = '2026-06-03 12:00:00+00',
  "nextAction" = 'Giving them time to settle back into Toronto before following up.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'ip-come-from-away';
