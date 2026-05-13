import { test } from '@playwright/test';
import { checkA11y, injectAxe } from '@axe-core/playwright';

const PAGES = [
  { name: 'Home',         path: '/Home.html' },
  { name: 'Product',      path: '/Product.html' },
  { name: 'Pricing',      path: '/Pricing.html' },
  { name: 'Customers',    path: '/Customers.html' },
  { name: 'Security',     path: '/Security.html' },
  { name: 'About',        path: '/About.html' },
  { name: 'Compare',      path: '/Compare.html' },
  { name: 'Blog',         path: '/Blog.html' },
  { name: 'Demo',         path: '/Demo.html' },
  { name: 'ROI',          path: '/ROI.html' },
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
