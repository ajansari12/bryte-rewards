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
  '/home': 'Home.html',
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

function marketingMiddleware(injectViteClient: boolean): Connect.NextHandleFunction {
  const marketingDir = path.join(process.cwd(), 'public', 'marketing');
  return (req, res, next) => {
    try {
      const url = req.url?.split('?')[0] ?? '/';
      if (url.startsWith('/@') || url.startsWith('/node_modules/') || url.startsWith('/src/')) {
        return next();
      }
      const file = marketingRoutes[url];
      if (!file) return next();

      const filePath = path.join(marketingDir, file);
      if (!fs.existsSync(filePath)) return next();

      let html = fs.readFileSync(filePath, 'utf-8');
      const headInjections: string[] = [];
      if (!/<base\s/i.test(html)) {
        headInjections.push('<base href="/marketing/">');
      }
      // Inject Vite's HMR client so the dev preview iframe (e.g. Bolt) keeps a
      // live WebSocket and doesn't force-reload the page. Skipped in `vite preview`
      // (production preview) where /@vite/client doesn't exist.
      if (injectViteClient) {
        headInjections.push('<script type="module" src="/@vite/client"></script>');
      }
      if (headInjections.length > 0) {
        html = html.replace(
          /<head(\s[^>]*)?>/i,
          (match) => `${match}\n  ${headInjections.join('\n  ')}`
        );
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(html);
    } catch {
      next();
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    {
      name: 'marketing-clean-urls',
      configureServer(server) {
        server.middlewares.use(marketingMiddleware(true));
      },
      configurePreviewServer(server) {
        server.middlewares.use(marketingMiddleware(false));
      },
    },
  ],
  build: {
    sourcemap: true,
  },
});
