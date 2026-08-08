const cors = {
  'Access-Control-Allow-Origin': 'https://luluclc3.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Cache-Control': 'no-store'
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return response({ ok: false, error: 'Method not allowed' }, 405);

    const origin = request.headers.get('Origin');
    if (origin !== 'https://luluclc3.github.io') return response({ ok: false, error: 'Forbidden' }, 403);

    let body;
    try { body = await request.json(); } catch { return response({ ok: false, error: 'Invalid JSON' }, 400); }
    if (typeof body?.code !== 'string' || body.code.length > 128) return response({ ok: false, error: 'Invalid code' }, 400);

    // The secret exists only in the Worker environment. Never put it in this file.
    const supplied = new TextEncoder().encode(body.code);
    const expected = new TextEncoder().encode(env.VIP_CODE || '');
    if (supplied.length !== expected.length) return response({ ok: false, error: 'Invalid code' }, 401);

    let diff = 0;
    for (let i = 0; i < supplied.length; i++) diff |= supplied[i] ^ expected[i];
    if (diff !== 0) return response({ ok: false, error: 'Invalid code' }, 401);

    // Short-lived session proof. The secret is never returned to the browser.
    const payload = btoa(JSON.stringify({ vip: true, exp: Date.now() + 30 * 60 * 1000 }));
    return response({ ok: true, token: payload });
  }
};
