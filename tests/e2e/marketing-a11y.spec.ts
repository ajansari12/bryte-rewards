import { test } from '@playwright/test';
import { checkA11y, injectAxe } from '@axe-core/playwright';

const PAGES = [
  { name: 'Home',         path: '/marketing/Home.html' },
  { name: 'Product',      path: '/marketing/Product.html' },
  { name: 'Pricing',      path: '/marketing/Pricing.html' },
  { name: 'Customers',    path: '/marketing/Customers.html' },
  { name: 'Integrations', path: '/marketing/Integrations.html' },
  { name: 'Security',     path: '/marketing/Security.html' },
  { name: 'About',        path: '/marketing/About.html' },
  { name: 'Compare',      path: '/marketing/Compare.html' },
  { name: 'Blog',         path: '/marketing/Blog.html' },
  { name: 'Demo',         path: '/marketing/Demo.html' },
  { name: 'ROI',          path: '/marketing/ROI.html' },
  { name: '404',          path: '/marketing/404.html' },
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
