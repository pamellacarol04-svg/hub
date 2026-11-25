import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const siteUrl = Deno.env.get("HUB_SITE_URL") ||
  "https://pamellacarol04-svg.github.io/hub/";
const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const encryptionKey = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY")!;
const cronSecret = Deno.env.get("GOOGLE_SYNC_CRON_SECRET")!;
const scope = "https://www.googleapis.com/auth/calendar.events";
const apiRoot = "https://www.googleapis.com/calendar/v3";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const admin = createClient(supabaseUrl, serviceKey);

type HubItem = {
  id: string;
  user_id: string;
  kind: "event" | "block";
  title: string | null;
  body: string | null;
  day: string | null;
  data: Record<string, unknown> | null;
  updated_at?: string;
};

type CalendarValue = {
  title: string;
  day: string;
  body: string;
  allDay: boolean;
  time: string;
  endTime: string;
  endDay: string;
  place: string;
};

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const originAllowed = (origin: string | null) =>
  !origin || origin === new URL(siteUrl).origin;

const corsHeaders = {
  "Access-Control-Allow-Origin": new URL(siteUrl).origin,
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

function requireGoogleSecrets() {
  if (!clientId || !clientSecret || !encryptionKey) {
    throw new Error(
      "Google OAuth e a chave de criptografia precisam ser configurados nos secrets do Supabase.",
    );
  }
}

function requireEncryptionKey() {
  const raw = Uint8Array.from(
    atob(encryptionKey),
    (char) => char.charCodeAt(0),
  );
  if (raw.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes.",
    );
  }
  return raw;
}

function b64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function encryptToken(token: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    requireEncryptionKey(),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      new TextEncoder().encode(token),
    ),
  );
  const packed = new Uint8Array(nonce.length + encrypted.length);
  packed.set(nonce);
  packed.set(encrypted, nonce.length);
  return b64(packed);
}

async function decryptToken(value: string) {
  const packed = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  const nonce = packed.slice(0, 12);
  const encrypted = packed.slice(12);
  const key = await crypto.subtle.importKey(
    "raw",
    requireEncryptionKey(),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encrypted,
  );
  return new TextDecoder().decode(plain);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new Error("Faça login no HUB para conectar o Google Agenda.");
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Sua sessão do HUB expirou. Entre novamente.");
  }
  return data.user;
}

async function refreshAccessToken(encryptedRefreshToken: string) {
  requireGoogleSecrets();
  const refreshToken = await decryptToken(encryptedRefreshToken);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(
      `Não foi possível renovar a autorização do Google: ${
        result.error_description || result.error || response.statusText
      }`,
    );
  }
  return result.access_token as string;
}

async function googleApi<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T | null> {
  const response = await fetch(`${apiRoot}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(
      `Google Agenda (${response.status}): ${
        result.error?.message || response.statusText
      }`,
    );
  }
  return response.status === 204 ? null : await response.json() as T;
}

const calendarPath = (eventId = "") =>
  `/calendars/primary/events${
    eventId ? `/${encodeURIComponent(eventId)}` : ""
  }`;

function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function timePlusHour(day: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + 60;
  return {
    day: addDays(day, Math.floor(total / 1440)),
    time: `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${
      String(total % 60).padStart(2, "0")
    }`,
  };
}

function dateTimeInZone(value: string, zone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("O Google Agenda retornou uma data inválida.");
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value || "";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function hubValue(item: HubItem) {
  const data = item.data || {};
  const time = String(
    item.kind === "block" ? data.start || "" : data.time || "",
  ).slice(0, 5);
  const explicitEnd = String(
    item.kind === "block" ? data.end || "" : data.endTime || "",
  ).slice(0, 5);
  const fallback = time ? timePlusHour(item.day!, time) : null;
  return {
    title: item.title || "",
    day: item.day || "",
    body: item.body || "",
    allDay: !time,
    time,
    endTime: time ? explicitEnd || fallback!.time : "",
    endDay: time
      ? String(data.endDay || fallback!.day)
      : String(data.endDay || item.day),
    place: String(data.place || ""),
  };
}

function googleValue(event: GoogleEvent, zone: string): CalendarValue {
  if (event.start?.date) {
    const endExclusive = event.end?.date || addDays(event.start.date, 1);
    return {
      title: event.summary || "",
      day: event.start.date,
      body: event.description || "",
      allDay: true,
      time: "",
      endTime: "",
      endDay: endExclusive === addDays(event.start.date, 1)
        ? event.start.date
        : addDays(endExclusive, -1),
      place: event.location || "",
    };
  }
  const start = dateTimeInZone(event.start?.dateTime || "", zone);
  const end = dateTimeInZone(event.end?.dateTime || "", zone);
  return {
    title: event.summary || "",
    day: start.day,
    body: event.description || "",
    allDay: false,
    time: start.time,
    endTime: end.time,
    endDay: end.day,
    place: event.location || "",
  };
}

function googleResource(item: HubItem, zone: string) {
  const value = hubValue(item);
  const resource: Record<string, unknown> = {
    summary: value.title,
    description: value.body,
    location: value.place,
  };
  if (value.allDay) {
    resource.start = { date: value.day };
    resource.end = { date: addDays(value.endDay || value.day, 1) };
  } else {
    resource.start = {
      dateTime: `${value.day}T${value.time}:00`,
      timeZone: zone,
    };
    resource.end = {
      dateTime: `${value.endDay || value.day}T${value.endTime}:00`,
      timeZone: zone,
    };
  }
  return resource;
}

function updatedHubData(
  item: HubItem,
  value: CalendarValue,
  metadata: Record<string, unknown>,
) {
  const data: Record<string, unknown> = {
    ...(item.data || {}),
    googleCalendar: metadata,
  };
  for (const key of ["start", "end", "time", "endTime", "endDay", "place"]) {
    delete data[key];
  }
  if (!value.allDay) {
    if (item.kind === "block") {
      data.start = value.time;
      data.end = value.endTime;
    } else {
      data.time = value.time;
      data.endTime = value.endTime;
    }
  }
  if (value.endDay && value.endDay !== value.day) data.endDay = value.endDay;
  if (value.place) data.place = value.place;
  return data;
}

function sameValue(left: CalendarValue, right: CalendarValue) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function saveHubItem(item: HubItem, changes: Partial<HubItem>) {
  const { error } = await admin.from("hub_items").update(changes).eq(
    "id",
    item.id,
  ).eq("user_id", item.user_id);
  if (error) throw error;
}

async function deleteHubItem(item: HubItem) {
  const { data: photos, error: photoError } = await admin
    .from("hub_photos").select("path,thumb").eq("item_id", item.id).eq(
      "user_id",
      item.user_id,
    );
  if (photoError) throw photoError;
  const paths = (photos || [])
    .flatMap((
      photo: { path: string | null; thumb: string | null },
    ) => [photo.path, photo.thumb])
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error } = await admin.storage.from("hub").remove(paths);
    if (error) throw error;
  }
  const { error: photosDeleteError } = await admin.from("hub_photos").delete()
    .eq("item_id", item.id).eq("user_id", item.user_id);
  if (photosDeleteError) throw photosDeleteError;
  const { error } = await admin.from("hub_items").delete().eq("id", item.id).eq(
    "user_id",
    item.user_id,
  );
  if (error) throw error;
}

async function linkedGoogleEvent(token: string, item: HubItem) {
  const metadata = item.data?.googleCalendar as
    | Record<string, unknown>
    | undefined;
  const eventId = typeof metadata?.eventId === "string" ? metadata.eventId : "";
  if (eventId) {
    return await googleApi<GoogleEvent>(token, calendarPath(eventId));
  }
  const query = new URLSearchParams({
    privateExtendedProperty: `hubItemId=${item.id}`,
    maxResults: "1",
    showDeleted: "true",
  });
  const page = await googleApi<{ items?: GoogleEvent[] }>(
    token,
    `${calendarPath()}?${query}`,
  );
  return page?.items?.[0] || null;
}

async function syncItem(
  token: string,
  connection: { time_zone: string },
  item: HubItem,
) {
  const metadata = item.data?.googleCalendar as {
    eventId?: string;
    snapshot?: CalendarValue;
  } | undefined;
  let remote = await linkedGoogleEvent(token, item);
  let needsSave = !metadata?.eventId || !metadata?.snapshot;
  if (remote?.status === "cancelled" || (metadata?.eventId && !remote)) {
    await deleteHubItem(item);
    return "deleted";
  }

  if (!remote) {
    remote = await googleApi<GoogleEvent>(token, calendarPath(), {
      method: "POST",
      body: {
        ...googleResource(item, connection.time_zone),
        extendedProperties: { private: { hubItemId: item.id } },
      },
    });
    needsSave = true;
  } else {
    const local = hubValue(item);
    const remoteValue = googleValue(remote, connection.time_zone);
    const googleChanged = !metadata?.snapshot ||
      !sameValue(remoteValue, metadata.snapshot);
    const hubChanged = Boolean(
      metadata?.snapshot && !sameValue(local, metadata.snapshot),
    );
    if (googleChanged) {
      const newKind = remoteValue.allDay && item.kind === "block"
        ? "event"
        : item.kind;
      const target = { ...item, kind: newKind } as HubItem;
      item.kind = newKind;
      item.title = remoteValue.title;
      item.day = remoteValue.day;
      item.body = remoteValue.body || null;
      item.data = updatedHubData(target, remoteValue, {
        calendarId: "primary",
        eventId: remote.id,
        snapshot: remoteValue,
      });
      needsSave = true;
    } else if (hubChanged) {
      remote = await googleApi<GoogleEvent>(token, calendarPath(remote.id), {
        method: "PATCH",
        body: {
          ...googleResource(item, connection.time_zone),
          extendedProperties: {
            ...(remote.extendedProperties || {}),
            private: {
              ...(remote.extendedProperties?.private || {}),
              hubItemId: item.id,
            },
          },
        },
      });
      needsSave = true;
    } else if (remote.extendedProperties?.private?.hubItemId !== item.id) {
      remote = await googleApi<GoogleEvent>(token, calendarPath(remote.id), {
        method: "PATCH",
        body: {
          extendedProperties: {
            ...(remote.extendedProperties || {}),
            private: {
              ...(remote.extendedProperties?.private || {}),
              hubItemId: item.id,
            },
          },
        },
      });
      needsSave = true;
    }
  }

  if (!remote) {
    throw new Error(
      `Não foi possível salvar o evento ${
        item.title || item.id
      } no Google Agenda.`,
    );
  }
  if (!needsSave) return "synced";
  const finalValue = googleValue(remote, connection.time_zone);
  const finalItem = { ...item, data: item.data || {} };
  await saveHubItem(finalItem, {
    data: updatedHubData(finalItem, finalValue, {
      calendarId: "primary",
      eventId: remote.id,
      snapshot: finalValue,
    }),
  });
  return "synced";
}

async function syncUser(userId: string) {
  const { data: connection, error } = await admin
    .from("hub_google_calendar_connections").select("*").eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!connection) {
    throw new Error("Conecte uma conta Google antes de sincronizar.");
  }

  try {
    const token = await refreshAccessToken(connection.encrypted_refresh_token);
    const { data: deletions, error: deletionError } = await admin
      .from("hub_google_calendar_deletions").select("*").eq("user_id", userId)
      .is("processed_at", null);
    if (deletionError) throw deletionError;
    for (const deletion of deletions || []) {
      await googleApi(token, calendarPath(deletion.google_event_id), {
        method: "DELETE",
      });
      const { error: markError } = await admin.from(
        "hub_google_calendar_deletions",
      )
        .update({ processed_at: new Date().toISOString() }).eq(
          "id",
          deletion.id,
        );
      if (markError) throw markError;
    }

    const { data: items, error: itemError } = await admin.from("hub_items")
      .select("*").eq("user_id", userId).in("kind", ["event", "block"]);
    if (itemError) throw itemError;
    const candidates = (items || []).filter((item: HubItem) =>
      datePattern.test(item.day || "")
    );
    let synced = 0;
    let deleted = 0;
    for (const item of candidates) {
      const result = await syncItem(token, connection, item);
      if (result === "deleted") deleted += 1;
      else synced += 1;
    }

    const { error: updateError } = await admin.from(
      "hub_google_calendar_connections",
    )
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (updateError) throw updateError;
    return { synced, deleted };
  } catch (error) {
    await admin.from("hub_google_calendar_connections").update({
      last_error: error instanceof Error
        ? error.message.slice(0, 500)
        : "Erro desconhecido",
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    throw error;
  }
}

async function callback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");
  if (!code || !rawState) {
    return Response.redirect(`${siteUrl}#/settings?calendar=error`, 303);
  }
  const stateHash = await sha256(rawState);
  const { data: state, error: stateError } = await admin.from(
    "hub_google_calendar_oauth_states",
  )
    .delete().eq("state_hash", stateHash).gt(
      "expires_at",
      new Date().toISOString(),
    ).select().maybeSingle();
  if (stateError || !state) {
    return Response.redirect(`${siteUrl}#/settings?calendar=expired`, 303);
  }

  requireGoogleSecrets();
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return Response.redirect(`${siteUrl}#/settings?calendar=error`, 303);
  }

  const { data: oldConnection } = await admin.from(
    "hub_google_calendar_connections",
  )
    .select("encrypted_refresh_token").eq("user_id", state.user_id)
    .maybeSingle();
  const refreshToken = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : oldConnection?.encrypted_refresh_token;
  if (!refreshToken) {
    return Response.redirect(`${siteUrl}#/settings?calendar=reauthorize`, 303);
  }
  const { error } = await admin.from("hub_google_calendar_connections").upsert({
    user_id: state.user_id,
    encrypted_refresh_token: refreshToken,
    time_zone: state.time_zone || "UTC",
    last_error: null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return Response.redirect(`${siteUrl}#/settings?calendar=error`, 303);
  }
  return Response.redirect(`${siteUrl}#/settings?calendar=connected`, 303);
}

async function connect(request: Request) {
  requireGoogleSecrets();
  const user = await authenticatedUser(request);
  const body = await request.json().catch(() => ({}));
  const timeZone = typeof body.timeZone === "string" ? body.timeZone : "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new Error("O fuso horário do dispositivo não é válido.");
  }

  const state = b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll(
    "+",
    "-",
  ).replaceAll("/", "_").replaceAll("=", "");
  const { error } = await admin.from("hub_google_calendar_oauth_states").insert(
    {
      state_hash: await sha256(state),
      user_id: user.id,
      time_zone: timeZone,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
  );
  if (error) throw error;
  const redirectUri = `${supabaseUrl}/functions/v1/google-calendar/callback`;
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return json({ authorizationUrl: authorize.toString() });
}

async function listEvents(token: string, params: Record<string, string> = {}) {
  const results: GoogleEvent[] = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({
      maxResults: "2500",
      singleEvents: "true",
      ...params,
    });
    if (pageToken) query.set("pageToken", pageToken);
    const page = await googleApi<
      { items?: GoogleEvent[]; nextPageToken?: string }
    >(token, `${calendarPath()}?${query}`);
    results.push(...(page?.items || []));
    pageToken = page?.nextPageToken || "";
  } while (pageToken);
  return results;
}

async function imports(request: Request, action: string) {
  const user = await authenticatedUser(request);
  const { data: connection, error } = await admin.from(
    "hub_google_calendar_connections",
  )
    .select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!connection) {
    throw new Error("Conecte uma conta Google antes de importar eventos.");
  }
  const token = await refreshAccessToken(connection.encrypted_refresh_token);

  if (action === "list-imports") {
    const events = await listEvents(token, {
      timeMin: new Date().toISOString(),
      orderBy: "startTime",
    });
    const { data: items } = await admin.from("hub_items").select("data").eq(
      "user_id",
      user.id,
    ).in("kind", ["event", "block"]);
    const linked = new Set(
      (items || []).map((item: { data?: Record<string, unknown> }) =>
        (item.data?.googleCalendar as Record<string, unknown> | undefined)
          ?.eventId
      ).filter(Boolean),
    );
    return json({
      events: events.filter((event) =>
        event.status !== "cancelled" &&
        !linked.has(event.id) &&
        !event.extendedProperties?.private?.hubItemId &&
        (event.start?.date || event.start?.dateTime)
      )
        .map((event) => ({
          id: event.id,
          summary: event.summary || "",
          start: event.start,
          location: event.location || "",
        })),
    });
  }

  const body = await request.json();
  const eventIds = [
    ...new Set(
      (Array.isArray(body.eventIds) ? body.eventIds : []).filter((
        id: unknown,
      ) => typeof id === "string"),
    ),
  ] as string[];
  if (!eventIds.length || eventIds.length > 100) {
    throw new Error("Selecione de 1 a 100 eventos para importar.");
  }
  const { data: existingItems, error: existingError } = await admin.from(
    "hub_items",
  ).select("data").eq("user_id", user.id).in("kind", ["event", "block"]);
  if (existingError) throw existingError;
  const existingEventIds = new Set(
    (existingItems || []).map((item: { data?: Record<string, unknown> }) =>
      (item.data?.googleCalendar as Record<string, unknown> | undefined)
        ?.eventId
    ).filter(Boolean),
  );
  const imported = [];
  for (const eventId of eventIds) {
    if (existingEventIds.has(eventId)) continue;
    const event = await googleApi<GoogleEvent>(token, calendarPath(eventId));
    if (!event || event.status === "cancelled") continue;
    const value = googleValue(event, connection.time_zone);
    const id = crypto.randomUUID();
    const data: Record<string, unknown> = {
      googleCalendar: { calendarId: "primary", eventId, snapshot: value },
    };
    if (!value.allDay) {
      data.time = value.time;
      data.endTime = value.endTime;
    }
    if (value.endDay && value.endDay !== value.day) data.endDay = value.endDay;
    if (value.place) data.place = value.place;
    const { error } = await admin.from("hub_items").insert({
      id,
      user_id: user.id,
      kind: "event",
      title: value.title,
      body: value.body || null,
      day: value.day,
      data,
      position: 0,
    });
    if (error) throw error;
    await googleApi(token, calendarPath(eventId), {
      method: "PATCH",
      body: {
        extendedProperties: {
          ...(event.extendedProperties || {}),
          private: {
            ...(event.extendedProperties?.private || {}),
            hubItemId: id,
          },
        },
      },
    });
    imported.push(id);
    existingEventIds.add(eventId);
  }
  return json({ imported: imported.length });
}

async function disconnect(request: Request) {
  const user = await authenticatedUser(request);
  const { data: connection } = await admin.from(
    "hub_google_calendar_connections",
  )
    .select("encrypted_refresh_token").eq("user_id", user.id).maybeSingle();
  let revocationWarning = "";
  if (connection) {
    try {
      const token = await decryptToken(connection.encrypted_refresh_token);
      const response = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${
          encodeURIComponent(token)
        }`,
        { method: "POST" },
      );
      if (!response.ok) {
        revocationWarning =
          "A conexão local foi removida, mas o Google não confirmou a revogação da autorização.";
      }
    } catch {
      revocationWarning =
        "A conexão local foi removida, mas não foi possível confirmar a revogação no Google.";
    }
  }
  const { error } = await admin.from("hub_google_calendar_connections").delete()
    .eq("user_id", user.id);
  if (error) throw error;
  return json({ disconnected: true, revocationWarning });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (!originAllowed(origin)) {
    return json({ error: "Origem não autorizada." }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ||
    (await request.clone().json().catch(() => ({}))).action;

  try {
    if (
      (action === "callback" || url.pathname.endsWith("/callback")) &&
      request.method === "GET"
    ) {
      return await callback(request);
    }
    if (action === "cron") {
      if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
        return json({ error: "Não autorizado." }, 401);
      }
      const { data: connections, error } = await admin.from(
        "hub_google_calendar_connections",
      ).select("user_id");
      if (error) throw error;
      const results = [];
      for (const connection of connections || []) {
        try {
          results.push({
            userId: connection.user_id,
            ...(await syncUser(connection.user_id)),
          });
        } catch (error) {
          results.push({
            userId: connection.user_id,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          });
        }
      }
      return json({ results });
    }

    if (request.method !== "POST") {
      return json({ error: "Método não permitido." }, 405);
    }
    const user = await authenticatedUser(request);
    if (action === "connect") return await connect(request);
    if (action === "sync") return json(await syncUser(user.id));
    if (action === "list-imports" || action === "import") {
      return await imports(request, action);
    }
    if (action === "disconnect") return await disconnect(request);
    if (action === "status") {
      const { data, error } = await admin.from(
        "hub_google_calendar_connections",
      )
        .select("last_synced_at,last_error").eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return json({
        connected: Boolean(data),
        lastSyncedAt: data?.last_synced_at || null,
        lastError: data?.last_error || null,
      });
    }
    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Erro inesperado no Google Agenda.";
    console.error(message);
    return json({ error: message }, 400);
  }
});
