const http = require('http');
const { URL } = require('url');

const TUNNEL_HOST = "cf.bebas11.workers.dev";
const PORT = process.env.PORT || 8000;

const server = http.createServer(async (req, res) => {
  try {
    // Bangun URL tujuan dari request asli
    const incomingUrl = new URL(req.url, `http://${req.headers.host}`);
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, `https://${TUNNEL_HOST}`);
    targetUrl.port = "443";

    // Salin header, override Host
    const headers = { ...req.headers };
    headers['host'] = TUNNEL_HOST;
    headers['x-forwarded-host'] = req.headers.host;

    // Baca body (jika ada)
    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    // Teruskan ke tunnel
    const proxyRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    // Kembalikan response ke client
    res.writeHead(proxyRes.status, Object.fromEntries(proxyRes.headers));
    const responseBody = await proxyRes.arrayBuffer();
    res.end(Buffer.from(responseBody));

  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: ' + err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy running on port ${PORT}`);
});
