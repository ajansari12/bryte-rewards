import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Map clean marketing URLs to the static HTML files in public/marketing/.
// The middleware reads the file and injects <base href="/marketing/"> so that
// all relative asset paths inside the HTML resolve correctly without a
// redirect (the URL bar stays clean, mirroring Netlify rewrite-with-200).
const marketingRoutes: Record<string, string> = {
  '/': 'Home.html',
  '/product': 'Product.html',
  '/pricing': 'Pricing.html',
  '/customers': 'Customers.html',
  '/integrations': 'Integrations.html',
  '/security': 'Security.html',
  '/about': 'About.html',
  '/compare': 'Compare.html',
  '/blog': 'Blog.html',
  '/blog/recognition-not-points': 'Blog-post-1.html',
  '/blog/values-refresh': 'Blog-post-2.html',
  '/demo': 'Demo.html',
  '/roi': 'ROI.html',
};

function marketingMiddleware(rootDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '/';
    const file = marketingRoutes[url];
    if (!file) return next();

    const filePath = path.join(rootDir, 'public', 'marketing', file);
    if (!fs.existsSync(filePath)) return next();

    let html = fs.readFileSync(filePath, 'utf-8');
    if (!/<base\s/i.test(html)) {
      html = html.replace(
        /<head(\s[^>]*)?>/i,
        (match) => `${match}\n  <base href="/marketing/">`
      );
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(html);
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: 'marketing-clean-urls',
      configureServer(server) {
        const root = server.config.root;
        server.middlewares.use(marketingMiddleware(root));
      },
      configurePreviewServer(server) {
        const root = server.config.root;
        server.middlewares.use(marketingMiddleware(root));
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    sourcemap: true,
  },
}));
