import type { VercelRequest, VercelResponse } from '@vercel/node'

// Server-side diagnostics endpoint for Supabase. Minimal, non-destructive, and
// does NOT reveal any secret values. Returns presence of env vars, the
// server-side SUPABASE_URL hostname (if present), and attempts safe read/write
// tests against public.availability using the server Supabase admin client.

// IMPORTANT: This file runs server-side in Vercel. It intentionally avoids
// echoing any secret values.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lazy import the admin client so this module never includes secrets at build time.
  let supabaseAdmin: any | null = null;
  try {
    const mod = await import('../src/integrations/supabase/client.server');
    supabaseAdmin = (mod as any).supabaseAdmin;
  } catch (e) {
    // If the import fails, include that fact in the report and return.
  }

  const envPresence = {
    SUPABASE_URL: !!process.env['SUPABASE_URL'],
    SUPABASE_PUBLISHABLE_KEY: !!process.env['SUPABASE_PUBLISHABLE_KEY'],
    SUPABASE_SERVICE_ROLE_KEY: !!process.env['SUPABASE_SERVICE_ROLE_KEY'],
    VITE_SUPABASE_URL: !!process.env['VITE_SUPABASE_URL'],
    VITE_SUPABASE_PUBLISHABLE_KEY: !!process.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
  };

  const report: any = {
    success: false,
    hostname: null,
    detected_project_hint: null,
    envPresence,
    clientImport: !!supabaseAdmin,
    availability: {
      exists: false,
      columns: null,
      read: { ok: false, error: null },
      write: { ok: false, error: null },
      realtime: { ok: false, error: null },
    },
  };

  // Derive hostname from SUPABASE_URL if present
  try {
    const url = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || null;
    if (url) {
      try {
        const u = new URL(url);
        report.hostname = u.hostname;
        if (u.hostname.includes('tvititvhlgasarfgjror')) report.detected_project_hint = 'tvititvhlgasarfgjror.supabase.co';
        else if (u.hostname.includes('ylwshejnofkrajxnlktl')) report.detected_project_hint = 'ylwshejnofkrajxnlktl.supabase.co';
        else report.detected_project_hint = u.hostname;
      } catch {
        report.hostname = url;
      }
    }
  } catch (e) {
    // ignore
  }

  if (!supabaseAdmin) {
    res.status(200).json(report);
    return;
  }

  // Try a safe SELECT (non-destructive)
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

  // Try a safe upsert using a transient diagnostic row. Use a unique person/slot
  // that won't collide with real users. Clean up after inserting.
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

  // Attempt to subscribe to realtime events for availability (non-blocking). Some
  // serverless environments do not keep subscriptions alive; success here means the
  // subscribe call did not error immediately.
  try {
    const channel = supabaseAdmin.channel('tolig_diag_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability' }, (payload: any) => {
        // noop
      });
    // subscribe() may return an object or a promise. Call it and catch errors.
    try {
      const sub = await channel.subscribe();
      report.availability.realtime.ok = true;
      // attempt to remove the channel if supported
      try {
        if (typeof supabaseAdmin.removeChannel === 'function') {
          await supabaseAdmin.removeChannel(channel);
        }
      } catch {
        // ignore cleanup errors
      }
    } catch (subErr: any) {
      // subscribe threw
      report.availability.realtime.ok = false;
      report.availability.realtime.error = String(subErr?.message ?? subErr);
    }
  } catch (e: any) {
    report.availability.realtime.ok = false;
    report.availability.realtime.error = String(e?.message ?? e);
  }

  // Cleanup diagnostic rows we created (non-destructive cleanup). Do NOT touch other rows.
  try {
    await supabaseAdmin.from('availability').delete().eq('person_id', testPerson).like('slot_id', '__diag_%');
  } catch {
    // ignore cleanup errors
  }

  report.success = true;
  res.status(200).json(report);
}
