export function getLogMeetingHref(contactId: string) {
  return `/meetings/new?contact=${contactId}`
}

export const PRIMARY_NAV_ROUTES = [
  '/',
  '/contacts',
  '/contacts/new',
  '/projects',
  '/projects/new',
  '/meetings',
  '/meetings/new',
  '/activity',
  '/materials',
  '/coverage',
  '/coverage/new',
  '/settings',
  '/market-intel',
  '/whiteboard',
  '/intake',
] as const
