const pad = (value) => String(value).padStart(2, '0');
codificador const = new TextEncoder();
const dateOnly = (day) => String(day).replaceAll('-', '');
const escaped = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

função utcDateTime(dia, hora) {
  const [ano, mês, data] = dia.split('-').map(Número);
  const [hora, minuto] = time.split(':').map(Número);
  const value = new Date(year, month - 1, date, hour, minute);
  retornar `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}00Z`;
}

função foldLine(linha) {
  const chunks = [];
  let chunk = '';
  let bytes = 0;
  para (const char da linha) {
    const size = encoder.encode(char).length;
    se (bytes + tamanho > 75) {
      chunks.push(chunk);
      bloco = ` ${char}`;
      bytes = tamanho + 1;
    } outro {
      bloco += caractere;
      bytes += tamanho;
    }
  }
  chunks.push(chunk);
  retornar chunks.join('\r\n');
}

função eventLines(item, carimbo) {
  const data = item.data || {};
  const linhas = [
    'INÍCIO:EVENTO',
    `UID:${escaped(item.id)}@hub.local`,
    `DTSTAMP:${stamp}`,
    `RESUMO:${escaped(item.title || 'Sem título')}`,
  ];
  if (item.body) lines.push(`DESCRIÇÃO:${escaped(item.body)}`);
  if (data.place) lines.push(`LOCATION:${escaped(data.place)}`);

  se (item.kind === 'block' || data.time) {
    const start = item.kind === 'block' ? String(data.start || '09:00') : String(data.time);
    const end = item.kind === 'block' ? String(data.end || '10:00') : String(data.endTime || '');
    const [startHour, startMinute] = start.split(':').map(Number);
    const [ano, mês, data] = item.day.split('-').map(Número);
    const fallbackEnd = new Date(year, month - 1, date, startHour, startMinute + 60);
    const endTime = end || `${pad(fallbackEnd.getHours())}:${pad(fallbackEnd.getMinutes())}`;
    const endDay = String(data.endDay || `${fallbackEnd.getFullYear()}-${pad(fallbackEnd.getMonth() + 1)}-${pad(fallbackEnd.getDate())}`);
    linhas.push(`DTSTART:${utcDateTime(item.day, start)}`);
    linhas.push(`DTEND:${utcDateTime(endDay, endTime)}`);
  } outro {
    const endDay = String(data.endDay || item.day);
    const exclusiveEnd = new Date(`${endDay}T00:00:00Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + (endDay === item.day ? 1 : 0));
    linhas.push(`DTSTART;VALUE=DATE:${dateOnly(item.day)}`);
    linhas.push(`DTEND;VALUE=DATE:${dateOnly(exclusiveEnd.toISOString().slice(0, 10))}`);
  }

  linhas.push('FIM:VEVENT');
  retornar linhas;
}

export function calendarIcs(items, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const entradas = itens
    .filter(item => ['event', 'block'].includes(item.kind) && /^\d{4}-\d{2}-\d{2}$/.test(item.day || ''))
    .flatMap(item => eventLines(item, stamp));
  retornar [
    'BEGIN:VCALENDAR',
    'VERSÃO:2.0',
    'PRODID:-//HUB//Google Calendar Export//PT-BR',
    'CALSCALE:GREGORIAN',
    'MÉTODO:PUBLICAR',
    ...entradas,
    'FIM:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
