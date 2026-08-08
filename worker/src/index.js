const cors = {
  'Access-Control-Allow-Origin': 'https://luluclc3.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Cache-Control': 'no-store'
};

// Mémoire temporaire du Worker : aucune KV/D1/R2 nécessaire.
// Elle peut être vidée quand Cloudflare recycle l'isolat, ce qui est volontaire.
const events = globalThis.__LULU_ANALYTICS__ || (globalThis.__LULU_ANALYTICS__ = []);
const MAX_EVENTS = 500;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function enc(s) { return new TextEncoder().encode(s); }
function b64url(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unb64url(s) {
  s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='=';
  const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function sign(value, secret) {
  const key=await crypto.subtle.importKey('raw',enc(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc(value))));
}
async function adminToken(env) {
  const payload=b64url(enc(JSON.stringify({role:'admin',exp:Date.now()+30*60*1000})));
  return payload+'.'+await sign(payload,env.ADMIN_SECRET||env.ADMIN_CODE||'');
}
async function validAdmin(token,env) {
  try {
    const [payload,sig]=String(token||'').split('.'); if(!payload||!sig)return false;
    const expected=await sign(payload,env.ADMIN_SECRET||env.ADMIN_CODE||'');
    if(sig!==expected)return false;
    const data=JSON.parse(new TextDecoder().decode(unb64url(payload)));
    return data.role==='admin'&&Number(data.exp)>Date.now();
  } catch { return false; }
}

function num(value, min = 0, max = 10**15) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
}
function text(value, max = 120) { return String(value ?? '').slice(0, max); }

function recordEvent(event, request) {
  const cf = request.cf || {};
  const safe = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    type: text(event.type || 'unknown', 40),
    session: text(event.session, 80),
    durationMs: num(event.durationMs, 0, 7*24*60*60*1000),
    operation: text(event.operation, 40),
    files: num(event.files, 0, 999),
    bytesIn: num(event.bytesIn),
    bytesOut: num(event.bytesOut),
    savedPct: Number.isFinite(Number(event.savedPct)) ? Math.max(-100, Math.min(100, Number(event.savedPct))) : null,
    profile: text(event.profile, 30),
    success: event.success !== false,
    lang: text(event.lang, 30),
    timezone: text(event.timezone, 80),
    screen: text(event.screen, 30),
    userAgent: text(request.headers.get('User-Agent'), 240),
    acceptLanguage: text(request.headers.get('Accept-Language'), 160),
    referer: text(request.headers.get('Referer'), 240),

    // Métadonnées réseau/Cloudflare utiles à l'admin, sans enregistrer l'IP brute.
    country: text(request.headers.get('CF-IPCountry') || cf.country, 4),
    continent: text(cf.continent, 8),
    region: text(cf.region, 80),
    city: text(cf.city, 80),
    postalCode: text(cf.postalCode, 24),
    cfTimezone: text(cf.timezone, 80),
    latitude: text(cf.latitude, 32),
    longitude: text(cf.longitude, 32),
    colo: text(cf.colo, 16),
    asn: num(cf.asn, 0, 2**32),
    asOrganization: text(cf.asOrganization, 160),
    httpProtocol: text(cf.httpProtocol, 20),
    tlsVersion: text(cf.tlsVersion, 30),
    tlsCipher: text(cf.tlsCipher, 60)
  };

  events.unshift(safe);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return safe;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return response({ ok: false, error: 'Method not allowed' }, 405);
    const origin = request.headers.get('Origin');
    if (origin !== 'https://luluclc3.github.io') return response({ ok: false, error: 'Forbidden' }, 403);
    let body; try { body=await request.json(); } catch { return response({ok:false,error:'Invalid JSON'},400); }

    if(body?.kind==='admin') {
      const supplied=enc(typeof body.code==='string'?body.code:'');
      const expected=enc(env.ADMIN_CODE||'');
      if(!expected.length||supplied.length!==expected.length)return response({ok:false,error:'Invalid code'},401);
      let diff=0; for(let i=0;i<supplied.length;i++)diff|=supplied[i]^expected[i];
      if(diff!==0)return response({ok:false,error:'Invalid code'},401);
      return response({ok:true,token:await adminToken(env)});
    }

    if(body?.kind==='event') {
      recordEvent(body.event || {}, request);
      return response({ok:true,buffered:events.length});
    }

    if(body?.kind==='list') {
      if(!(await validAdmin(body.token,env)))return response({ok:false,error:'Unauthorized'},401);
      return response({
        ok:true,
        events:events.slice(0,500),
        meta:{
          now:Date.now(),
          buffered:events.length,
          maxBuffered:MAX_EVENTS,
          persistent:false,
          storage:'worker-memory',
          note:'Les événements peuvent disparaître lors du recyclage du Worker.'
        }
      });
    }

    if (typeof body?.code !== 'string' || body.code.length > 128) return response({ ok: false, error: 'Invalid code' }, 400);
    const supplied = enc(body.code), expected = enc(env.VIP_CODE || '');
    if (supplied.length !== expected.length) return response({ ok: false, error: 'Invalid code' }, 401);
    let diff = 0; for (let i=0;i<supplied.length;i++) diff |= supplied[i]^expected[i];
    if (diff !== 0) return response({ ok: false, error: 'Invalid code' }, 401);
    const payload=btoa(JSON.stringify({vip:true,exp:Date.now()+30*60*1000}));
    return response({ok:true,token:payload});
  }
};
