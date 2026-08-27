import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function runSupabaseDiagnostics(request: Request) {
  // Do not reveal secrets. Run server-side diagnostics using the server admin client.
  const report: any = {
    success: false,
    hostname: null,
    detected_project_hint: null,
    envPresence: {
      SUPABASE_URL: !!process.env['SUPABASE_URL'],
      SUPABASE_PUBLISHABLE_KEY: !!process.env['SUPABASE_PUBLISHABLE_KEY'],
      SUPABASE_SERVICE_ROLE_KEY: !!process.env['SUPABASE_SERVICE_ROLE_KEY'],
      VITE_SUPABASE_URL: !!process.env['VITE_SUPABASE_URL'],
      VITE_SUPABASE_PUBLISHABLE_KEY: !!process.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
    },
    clientAvailable: false,
    availability: {
      exists: false,
      columns: null,
      read: { ok: false, error: null },
      write: { ok: false, error: null },
      realtime: { ok: false, error: null },
    },
  };

  try {
    const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || null;
    if (url) {
      try {
        const u = new URL(String(url));
        report.hostname = u.hostname;
        if (u.hostname.includes('tvititvhlgasarfgjror')) report.detected_project_hint = 'tvititvhlgasarfgjror.supabase.co';
        else if (u.hostname.includes('ylwshejnofkrajxnlktl')) report.detected_project_hint = 'ylwshejnofkrajxnlktl.supabase.co';
        else report.detected_project_hint = u.hostname;
      } catch {
        report.hostname = String(url);
      }
    }
  } catch (e) {
    // ignore
  }

  // Import server admin client dynamically
  let supabaseAdmin: any = null;
  try {
    const mod = await import("./integrations/supabase/client.server");
    supabaseAdmin = (mod as any).supabaseAdmin;
    report.clientAvailable = !!supabaseAdmin;
  } catch (e) {
    report.clientAvailable = false;
    return report;
  }

  // Safe SELECT
  try {
    const { data, error } = await supabaseAdmin.from('availability').select('id, person_id, slot_id, status, comment, updated_at').limit(1);
    if (!error) {
      report.availability.exists = true;
      report.availability.columns = data && data.length > 0 ? Object.keys(data[0]) : ['id','person_id','slot_id','status','comment','updated_at'];
      report.availability.read.ok = true;
    } else {
      report.availability.read.ok = false;
      report.availability.read.error = typeof error === 'object' ? String(error.message ?? error) : String(error);
    }
  } catch (e: any) {
    report.availability.read.ok = false;
    report.availability.read.error = String(e?.message ?? e);
  }

  // Safe upsert test (non-destructive). Use a diagnostic marker person id.
  const testPerson = '__tolig_diag__';
  const testSlot = `__diag_${Date.now()}__`;
  try {
    const payload = { person_id: testPerson, slot_id: testSlot, status: 'maybe', comment: 'diagnostic', updated_at: new Date().toISOString() };
    const { data: upsertData, error: upsertError } = await supabaseAdmin.from('availability').upsert(payload, { onConflict: 'person_id,slot_id', returning: 'representation' });
    if (!upsertError) {
      report.availability.write.ok = true;
    } else {
      report.availability.write.ok = false;
      report.availability.write.error = typeof upsertError === 'object' ? String(upsertError.message ?? upsertError) : String(upsertError);
    }
  } catch (e: any) {
    report.availability.write.ok = false;
    report.availability.write.error = String(e?.message ?? e);
  }

  // Attempt realtime subscribe (best-effort)
  try {
    const channel = supabaseAdmin.channel('tolig_diag_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, (payload: any) => {
        // noop
      });
    try {
      const sub = await channel.subscribe();
      report.availability.realtime.ok = true;
      try {
        if (typeof supabaseAdmin.removeChannel === 'function') {
          await supabaseAdmin.removeChannel(channel);
        }
      } catch {
        // ignore
      }
    } catch (subErr: any) {
      report.availability.realtime.ok = false;
      report.availability.realtime.error = String(subErr?.message ?? subErr);
    }
  } catch (e: any) {
    report.availability.realtime.ok = false;
    report.availability.realtime.error = String(e?.message ?? e);
  }

  // Cleanup test rows
  try {
    await supabaseAdmin.from('availability').delete().eq('person_id', testPerson).like('slot_id', '__diag_%');
  } catch {
    // ignore cleanup errors
  }

  report.success = true;
  return report;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/__supabase_diagnostics') {
        const report = await runSupabaseDiagnostics(request);
        return new Response(JSON.stringify(report, null, 2), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
