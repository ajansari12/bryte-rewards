import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { Connect } from 'vite';

// In production, Netlify rewrites these clean URLs server-side (status 200) so
// the URL bar stays clean. Locally we issue 302 redirects to the actual file
// so relative asset paths inside the marketing HTML resolve correctly.
const marketingRedirects: Record<string, string> = {
  '/': '/marketing/Home.html',
  '/product': '/marketing/Product.html',
  '/pricing': '/marketing/Pricing.html',
  '/customers': '/marketing/Customers.html',
  '/integrations': '/marketing/Integrations.html',
  '/security': '/marketing/Security.html',
  '/about': '/marketing/About.html',
  '/compare': '/marketing/Compare.html',
  '/blog': '/marketing/Blog.html',
  '/blog/recognition-not-points': '/marketing/Blog-post-1.html',
  '/blog/values-refresh': '/marketing/Blog-post-2.html',
  '/demo': '/marketing/Demo.html',
  '/roi': '/marketing/ROI.html',
};

function marketingRedirectMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url?.split('?')[0] ?? '/';
    const target = marketingRedirects[url];
    if (target) {
      res.statusCode = 302;
      res.setHeader('Location', target);
      res.end();
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
      name: 'marketing-redirects',
      configureServer(server) {
        server.middlewares.use(marketingRedirectMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(marketingRedirectMiddleware());
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
