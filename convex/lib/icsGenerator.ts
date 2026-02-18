/**
 * ICS Calendar File Generator
 *
 * Generates RFC 5545 compliant ICS files for appointment calendar events.
 * Used by patient magic links to enable "Add to Calendar" functionality.
 *
 * @module lib/icsGenerator
 */

export interface ICSEventData {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  organizer?: string;
}

/**
 * Escape special characters per RFC 5545
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Format date string (YYYY-MM-DD) and time (HH:MM) to ICS datetime format (YYYYMMDDTHHMMSS)
 */
function formatICSDateTime(date: string, time: string): string {
  // date: YYYY-MM-DD, time: HH:MM
  const [year, month, day] = date.split("-");
  const [hour, minute] = time.split(":");
  return `${year}${month}${day}T${hour}${minute}00`;
}

/**
 * Generate a unique identifier for the event
 */
function generateUID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}@occuflow.co.uk`;
}

/**
 * Generate current timestamp in ICS format for DTSTAMP
 */
function getCurrentICSTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Generate RFC 5545 compliant ICS calendar file
 *
 * @param event - Event data for the calendar entry
 * @returns Complete ICS file content as string
 */
export function generateICS(event: ICSEventData): string {
  const uid = generateUID();
  const dtstamp = getCurrentICSTimestamp();
  const dtstart = formatICSDateTime(event.startDate, event.startTime);
  const dtend = formatICSDateTime(event.startDate, event.endTime);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OccuFlow//Appointment System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  // Add optional description
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  // Add optional location
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  // Add optional organizer
  if (event.organizer) {
    lines.push(`ORGANIZER;CN=OccuFlow:mailto:${event.organizer}`);
  }

  lines.push("STATUS:CONFIRMED");

  // Add reminder alarm - 1 hour before
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment Reminder",
    "TRIGGER:-PT1H",
    "END:VALARM"
  );

  lines.push("END:VEVENT", "END:VCALENDAR");

  // ICS files use CRLF line endings per RFC 5545
  return lines.join("\r\n");
}
