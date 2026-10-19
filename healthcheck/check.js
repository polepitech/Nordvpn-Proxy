import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';

const SOCKS_HOST = process.env.SOCKS_HOST || 'nord-proxy';
const SOCKS_PORT = process.env.SOCKS_PORT || '1080';
const KUMA_PUSH_URL = process.env.KUMA_PUSH_URL;
const CHECK_INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS || 60_000);

if (!KUMA_PUSH_URL) {
  console.error('Missing KUMA_PUSH_URL in env');
  process.exit(1);
}

const socksUrl = `socks5h://${SOCKS_HOST}:${SOCKS_PORT}`;
const agent = new SocksProxyAgent(socksUrl);

async function getIp(viaSocks) {
  const opts = {
    timeout: 15_000,
    ...(viaSocks ? { agent } : {}),
  };
  const res = await fetch('https://api.ipify.org?format=json', opts);
  if (!res.ok) throw new Error(`ipify HTTP ${res.status}`);
  const data = await res.json();
  return data.ip;
}

async function pushKuma(status, msg) {
  const url = new URL(KUMA_PUSH_URL);
  url.searchParams.set('status', status);
  url.searchParams.set('msg', msg);
  url.searchParams.set('ping', String(Date.now()));

  const res = await fetch(url.toString(), { timeout: 10_000 });
  if (!res.ok) {
    throw new Error(`Kuma push HTTP ${res.status}`);
  }
}

async function checkOnce() {
  const started = Date.now();
  try {
    const [proxyIp, directIp] = await Promise.all([
      getIp(true),
      getIp(false).catch(() => null),
    ]);

    if (!proxyIp) {
      throw new Error('empty proxy IP');
    }

    // Proxy must answer, and ideally differ from the host/VPS public IP
    if (directIp && proxyIp === directIp) {
      throw new Error(`proxy IP equals direct IP (${proxyIp}) — VPN leak?`);
    }

    const latency = Date.now() - started;
    const msg = directIp
      ? `proxy_ok ip=${proxyIp} direct=${directIp} ${latency}ms`
      : `proxy_ok ip=${proxyIp} ${latency}ms`;

    await pushKuma('up', msg);
    console.log(`[up] ${msg}`);
  } catch (err) {
    const msg = `proxy_down: ${err.message || err}`;
    try {
      await pushKuma('down', msg.slice(0, 200));
    } catch (pushErr) {
      console.error('[kuma push failed]', pushErr.message || pushErr);
    }
    console.error(`[down] ${msg}`);
  }
}

console.log(`Nord proxy healthcheck started`);
console.log(`SOCKS=${socksUrl} interval=${CHECK_INTERVAL_MS}ms`);

await checkOnce();
setInterval(checkOnce, CHECK_INTERVAL_MS);
