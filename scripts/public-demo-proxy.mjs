#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PUBLIC_DEMO_PORT ?? 8080);
const frontendOrigin = process.env.PUBLIC_DEMO_FRONTEND_ORIGIN ?? 'http://localhost:5173';
const apiOrigin = process.env.PUBLIC_DEMO_API_ORIGIN ?? 'http://localhost:3000';

function proxyRequest(request, response, targetOrigin, rewritePath = (path) => path) {
  const target = new URL(request.url ?? '/', targetOrigin);
  target.pathname = rewritePath(target.pathname);

  const upstream = http.request(
    target,
    {
      method: request.method,
      headers: {
        ...request.headers,
        host: target.host,
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', (error) => {
    response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: `Proxy error: ${error.message}` }));
  });

  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;

  if (path === '/runtime-config.js') {
    response.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end('window.__INVENTORY_CONFIG__ = {"apiUrl":"/api"};\n');
    return;
  }

  if (path === '/api' || path.startsWith('/api/')) {
    proxyRequest(request, response, apiOrigin);
    return;
  }

  proxyRequest(request, response, frontendOrigin);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Public demo proxy listening on http://localhost:${port}`);
  console.log(`Frontend origin: ${frontendOrigin}`);
  console.log(`API origin: ${apiOrigin}`);
});
