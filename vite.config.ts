import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { Connect } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Mirrors the Netlify _redirects rules for local dev / preview
function marketingRewriteMiddleware(): Connect.NextHandleFunction {
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

  const spaRoutes = new Set(['/login', '/signup', '/onboarding']);

  return (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '/';

    // Let SPA routes and /app/* pass through to index.html
    if (spaRoutes.has(url) || url.startsWith('/app/')) return next();

    // Let asset requests pass through
    if (url.startsWith('/assets/') || url.startsWith('/src/') || url.startsWith('/marketing/') || url.startsWith('/og/') || url.includes('.')) return next();

    const file = marketingRoutes[url];
    if (file) {
      const filePath = path.resolve('public/marketing', file);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/html');
        res.end(fs.readFileSync(filePath, 'utf-8'));
        return;
      }
    }

    // Unknown path → 404 marketing page
    const notFound = path.resolve('public/marketing/404.html');
    if (fs.existsSync(notFound)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end(fs.readFileSync(notFound, 'utf-8'));
      return;
    }

    next();
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: 'marketing-rewrites',
      configureServer(server) {
        server.middlewares.use(marketingRewriteMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(marketingRewriteMiddleware());
      },
    },
  ],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
  },
});
