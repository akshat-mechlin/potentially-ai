import type { ImportedContactRow } from "@/lib/integrations/google-contacts";

type CalendarAttendee = {
  email?: string;
  displayName?: string;
  self?: boolean;
};

type CalendarEvent = {
  summary?: string;
  attendees?: CalendarAttendee[];
  organizer?: { email?: string; displayName?: string; self?: boolean };
};

/**
 * Pull people from upcoming/recent Google Calendar events (attendees + organizers).
 */
export async function fetchGoogleCalendarContacts(
  accessToken: string,
): Promise<ImportedContactRow[]> {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 90);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 90);

  const people = new Map<string, ImportedContactRow>();
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Google calendar fetch failed: ${res.status} ${body.slice(0, 200)}`);
      }
      throw new Error(
        body.toLowerCase().includes("access not configured") || body.includes("Calendar API")
          ? "Enable Google Calendar API in Google Cloud Console for your OAuth client."
          : `Google calendar fetch failed: ${res.status} ${body.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      items?: CalendarEvent[];
      nextPageToken?: string;
    };

    for (const event of data.items ?? []) {
      const candidates = [
        ...(event.attendees ?? []),
        event.organizer ? { ...event.organizer } : null,
      ].filter(Boolean) as CalendarAttendee[];

      for (const person of candidates) {
        if (person.self) continue;
        const email = person.email?.trim().toLowerCase();
        if (!email || !email.includes("@")) continue;

        const fullName = person.displayName?.trim() || email.split("@")[0] || email;
        const existing = people.get(email);
        if (!existing) {
          people.set(email, {
            full_name: fullName,
            email,
            external_id: `gcal:${email}`,
          });
        }
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return [...people.values()];
}
