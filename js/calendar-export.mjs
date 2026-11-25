const pad = (value) => String(value).padStart(2, '0');
const encoder = new TextEncoder();
const dateOnly = (day) => String(day).replaceAll('-', '');
const escaped = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

function utcDateTime(day, time) {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, date, hour, minute);
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}00Z`;
}

function foldLine(line) {
  const chunks = [];
  let chunk = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      chunks.push(chunk);
      chunk = ` ${char}`;
      bytes = size + 1;
    } else {
      chunk += char;
      bytes += size;
    }
  }
  chunks.push(chunk);
  return chunks.join('\r\n');
}

function eventLines(item, stamp) {
  const data = item.data || {};
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escaped(item.id)}@hub.local`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escaped(item.title || 'Sem título')}`,
  ];
  if (item.body) lines.push(`DESCRIPTION:${escaped(item.body)}`);
  if (data.place) lines.push(`LOCATION:${escaped(data.place)}`);

  if (item.kind === 'block' || data.time) {
    const start = item.kind === 'block' ? String(data.start || '09:00') : String(data.time);
    const end = item.kind === 'block' ? String(data.end || '10:00') : String(data.endTime || '');
    const [startHour, startMinute] = start.split(':').map(Number);
    const [year, month, date] = item.day.split('-').map(Number);
    const fallbackEnd = new Date(year, month - 1, date, startHour, startMinute + 60);
    const endTime = end || `${pad(fallbackEnd.getHours())}:${pad(fallbackEnd.getMinutes())}`;
    const endDay = String(data.endDay || `${fallbackEnd.getFullYear()}-${pad(fallbackEnd.getMonth() + 1)}-${pad(fallbackEnd.getDate())}`);
    lines.push(`DTSTART:${utcDateTime(item.day, start)}`);
    lines.push(`DTEND:${utcDateTime(endDay, endTime)}`);
  } else {
    const endDay = String(data.endDay || item.day);
    const exclusiveEnd = new Date(`${endDay}T00:00:00Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + (endDay === item.day ? 1 : 0));
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(item.day)}`);
    lines.push(`DTEND;VALUE=DATE:${dateOnly(exclusiveEnd.toISOString().slice(0, 10))}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

export function calendarIcs(items, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const entries = items
    .filter(item => ['event', 'block'].includes(item.kind) && /^\d{4}-\d{2}-\d{2}$/.test(item.day || ''))
    .flatMap(item => eventLines(item, stamp));
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HUB//Google Calendar Export//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...entries,
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
