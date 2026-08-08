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
      if(!env.ANALYTICS_KV)return response({ok:false,error:'Analytics storage not configured'},503);
      const event=body.event||{};
      const safe={
        id:crypto.randomUUID(), ts:Date.now(), type:String(event.type||'unknown').slice(0,40),
        session:String(event.session||'').slice(0,80), durationMs:Number(event.durationMs)||0,
        operation:String(event.operation||'').slice(0,40), files:Math.min(999,Math.max(0,Number(event.files)||0)),
        bytesIn:Math.min(10**15,Math.max(0,Number(event.bytesIn)||0)), bytesOut:Math.min(10**15,Math.max(0,Number(event.bytesOut)||0)),
        savedPct:Number.isFinite(Number(event.savedPct))?Math.max(-100,Math.min(100,Number(event.savedPct))):null,
        profile:String(event.profile||'').slice(0,30), success:event.success!==false,
        lang:String(event.lang||'').slice(0,20), timezone:String(event.timezone||'').slice(0,60),
        screen:String(event.screen||'').slice(0,30), userAgent:String(request.headers.get('User-Agent')||'').slice(0,240),
        country:String(request.headers.get('CF-IPCountry')||'').slice(0,4), colo:String(request.cf?.colo||'').slice(0,12)
      };
      await env.ANALYTICS_KV.put('event:'+safe.ts+':'+safe.id,JSON.stringify(safe),{expirationTtl:60*60*24*30});
      return response({ok:true});
    }

    if(body?.kind==='list') {
      if(!(await validAdmin(body.token,env)))return response({ok:false,error:'Unauthorized'},401);
      if(!env.ANALYTICS_KV)return response({ok:false,error:'Analytics storage not configured'},503);
      const listed=await env.ANALYTICS_KV.list({prefix:'event:',limit:1000});
      const events=[];
      for(const k of listed.keys){const v=await env.ANALYTICS_KV.get(k.name);if(v)try{events.push(JSON.parse(v))}catch{}}
      events.sort((a,b)=>b.ts-a.ts);
      return response({ok:true,events:events.slice(0,500)});
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
