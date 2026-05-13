import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Map clean marketing URLs to the static HTML files now at the public/ root.
// Mirrors the production _redirects rules so dev/preview behave identically.
const marketingRoutes: Record<string, string> = {
  '/': 'Home.html',
  '/product': 'Product.html',
  '/pricing': 'Pricing.html',
  '/customers': 'Customers.html',
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

    const filePath = path.join(rootDir, 'public', file);
    if (!fs.existsSync(filePath)) return next();

    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(html);
  };
}

export default defineConfig(() => ({
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
