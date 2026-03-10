# Google Calendar OAuth Sync (Philip)

## Required env vars

Add these to `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (example: `http://localhost:3000/api/calendar/oauth/callback`)

## Google Cloud setup

1. Create OAuth 2.0 Client ID (Web application) in Google Cloud Console.
2. Add redirect URI exactly matching `GOOGLE_REDIRECT_URI`.
3. Enable **Google Calendar API** for the project.
4. Scope used by CRM MVP: `https://www.googleapis.com/auth/calendar.readonly`.

## In-app flow

1. Open **Meetings**.
2. Click **Connect Google Calendar** and complete OAuth consent.
3. Return to Meetings and click **Sync now**.
4. Synced events are stored in CRM and shown in Upcoming/Past views.

## Failure handling

- If OAuth fails, Meetings shows an error banner.
- If sync fails, Meetings displays the most recent sync error.
- If no account connected, Meetings shows connect CTA (no 404/dead state).

## Next step for bi-directional sync

Current implementation is **one-way** (Google → CRM cache). To support safe bi-directional sync:
- add event write scope (`calendar.events`),
- introduce outbound sync queue + conflict handling,
- add source-of-truth markers and idempotency keys.
