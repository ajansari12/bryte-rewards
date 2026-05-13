import { test } from '@playwright/test';
import { checkA11y, injectAxe } from '@axe-core/playwright';

const PAGES = [
  { name: 'Home',         path: '/home.html' },
  { name: 'Product',      path: '/product.html' },
  { name: 'Pricing',      path: '/pricing.html' },
  { name: 'Customers',    path: '/customers.html' },
  { name: 'Security',     path: '/security.html' },
  { name: 'About',        path: '/about.html' },
  { name: 'Compare',      path: '/compare.html' },
  { name: 'Blog',         path: '/blog.html' },
  { name: 'Demo',         path: '/demo.html' },
  { name: 'ROI',          path: '/roi.html' },
  { name: '404',          path: '/404.html' },
];

test.describe('Marketing pages — axe accessibility', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page passes axe`, async ({ page }) => {
      await page.goto(path);
      // Wait for fonts + JS to settle
      await page.waitForLoadState('networkidle');

      await injectAxe(page);
      await checkA11y(page, undefined, {
        axeOptions: {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        },
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });
  }
});
