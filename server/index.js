import { createApp } from './app.js';
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = createApp();
const production = process.argv.includes('--production');
const root = fileURLToPath(new URL('..', import.meta.url));
app.get('/THIRD_PARTY_NOTICES.md', (req, res) => res.type('text/plain').sendFile(path.join(root, 'THIRD_PARTY_NOTICES.md')));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (/^\/(charts|reports|library|compare|profiles|share|checkout)/.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
if (production) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(root, 'dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 3000);
app.listen(port, '127.0.0.1', () => console.log(`READY http://127.0.0.1:${port} (${production ? 'build' : 'development'}; private preview)`));
