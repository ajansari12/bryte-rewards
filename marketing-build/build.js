#!/usr/bin/env node
/**
 * Bryte Marketing site build script.
 * Reads each source HTML page, inlines shared partials, upgrades SEO tags,
 * fixes CTAs to point at app.bryte.app, adds performance + a11y attributes,
 * and writes the result back in-place.
 *
 * Run: node marketing-build/build.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ── Page metadata ────────────────────────────────────────────────────────────
const pages = [
  {
    file: 'home.html',
    slug: 'home',
    title: 'Bryte Rewards — Recognition that feels Canadian.',
    description: 'Bryte Rewards helps Canadian teams say the things that matter, out loud. Employee recognition built on your values, your words, and your currency.',
    ogTitle: 'Bryte Rewards — Recognition that feels Canadian.',
  },
  {
    file: 'product.html',
    slug: 'product',
    title: 'Product — Bryte Rewards',
    description: 'Recognition feeds, values editor, manager dashboards, peer-nominated badges, and rewards — all in one PIPEDA-ready platform built for Canadian teams.',
    ogTitle: 'Product Features — Bryte Rewards',
  },
  {
    file: 'pricing.html',
    slug: 'pricing',
    title: 'Pricing — Bryte Rewards',
    description: 'Per person, per month, in Canadian dollars. Your rewards budget is yours — we take zero cut. Straightforward pricing for teams of 10 to 10,000.',
    ogTitle: 'Transparent Pricing in CAD — Bryte Rewards',
  },
  {
    file: 'customers.html',
    slug: 'customers',
    title: 'Customers — Bryte Rewards',
    description: 'See how Canadian hospitality, trades, healthcare, and retail teams use Bryte Rewards to build recognition cultures that stick.',
    ogTitle: 'Customer Stories — Bryte Rewards',
  },
  {
    file: 'security.html',
    slug: 'security',
    title: 'Security & Privacy — Bryte Rewards',
    description: 'PIPEDA-compliant, Canadian data residency, SOC 2 Type II in progress. Your employee data stays in Canada.',
    ogTitle: 'Security & Privacy — Bryte Rewards',
  },
  {
    file: 'about.html',
    slug: 'about',
    title: 'About — Bryte Rewards',
    description: 'We\'re a small team in Toronto building recognition software that actually sounds like your company, not a Silicon Valley HR tool.',
    ogTitle: 'About Bryte Rewards',
  },
  {
    file: 'compare.html',
    slug: 'compare',
    title: 'Bryte Rewards vs Bonusly — an honest comparison',
    description: 'Switching from Bonusly, Kudos, or Achievers? Here\'s an honest side-by-side. Canadian pricing, Canadian data residency, no commissions on rewards.',
    ogTitle: 'Bryte Rewards vs Bonusly — Honest Comparison',
  },
  {
    file: 'blog.html',
    slug: 'blog',
    title: 'Journal — Bryte Rewards',
    description: 'Essays on recognition, company culture, and building workplaces where people feel seen. Written by the team at Bryte Rewards.',
    ogTitle: 'The Bryte Rewards Journal',
  },
  {
    file: 'blog-post-1.html',
    slug: 'blog-post-1',
    title: 'Recognition is not a points problem — Bryte Rewards Journal',
    description: 'Why the mechanics of your recognition programme matter less than whether your managers actually mean it when they click send.',
    ogTitle: 'Recognition is not a points problem',
  },
  {
    file: 'blog-post-2.html',
    slug: 'blog-post-2',
    title: 'Running a values refresh — Bryte Rewards Journal',
    description: 'A practical playbook for refreshing your company values without the off-site, the consultant, or the all-hands awkwardness.',
    ogTitle: 'Running a values refresh: a practical playbook',
  },
  {
    file: 'demo.html',
    slug: 'demo',
    title: 'Book a demo — Bryte Rewards',
    description: 'Thirty minutes with a real human, on your schedule. See Bryte Rewards on your own values and your own team. No sales deck, no hard pitch.',
    ogTitle: 'Book a Demo — Bryte Rewards',
  },
  {
    file: 'roi.html',
    slug: 'roi',
    title: 'ROI calculator — Bryte Rewards',
    description: 'Estimate the return on a recognition programme for your team. Based on retention savings, productivity uplift, and reduced absenteeism data from Canadian employers.',
    ogTitle: 'Recognition ROI Calculator — Bryte Rewards',
  },
  {
    file: '404.html',
    slug: '404',
    title: 'Not found — Bryte Rewards',
    description: 'The page you were looking for doesn\'t exist. Head back to the Bryte Rewards home page.',
    ogTitle: 'Page not found — Bryte Rewards',
  },
];

// ── Partials ─────────────────────────────────────────────────────────────────
const headerHtml = readFileSync(join(__dir, '_partials/header.html'), 'utf8');
const footerHtml = readFileSync(join(__dir, '_partials/footer.html'), 'utf8');

// ── Helpers ──────────────────────────────────────────────────────────────────

const SLUG_TO_PATH = {
  home: '/',
  product: '/product.html',
  pricing: '/pricing.html',
  customers: '/customers.html',
  security: '/security.html',
  about: '/about.html',
  compare: '/compare.html',
  blog: '/blog.html',
  'blog-post-1': '/blog-post-1.html',
  'blog-post-2': '/blog-post-2.html',
  demo: '/demo.html',
  roi: '/roi.html',
  '404': '/404.html',
};

function buildSeoBlock(page) {
  const path = SLUG_TO_PATH[page.slug] ?? `/${page.slug}`;
  const canonical = `https://bryte.app${path === '/' ? '' : path}${path === '/' ? '/' : ''}`;
  const ogImage = `https://bryte.app/og/${page.slug}.png`;
  return `
<!-- SEO + Social -->
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bryte Rewards">
<meta property="og:title" content="${page.ogTitle}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@bryteapp">
<meta name="twitter:title" content="${page.ogTitle}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${ogImage}">`.trim();
}

function buildPreconnect() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
}

function injectHead(html, page) {
  // 1. Ensure title + meta description are correct
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
  if (!html.includes('<meta name="description"')) {
    html = html.replace('</title>', `</title>\n<meta name="description" content="${page.description}">`);
  } else {
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${page.description}">`);
  }

  // 2. Inject preconnect before stylesheet link
  if (!html.includes('fonts.googleapis.com')) {
    html = html.replace(/<link rel="stylesheet"/, `${buildPreconnect()}\n<link rel="stylesheet"`);
  }

  // 3. Inject SEO block before </head>
  if (!html.includes('og:title')) {
    html = html.replace('</head>', `${buildSeoBlock(page)}\n</head>`);
  }

  // 4. Update asset versions
  html = html.replace(/site\.css\?v=\d+/, 'site.css?v=9');
  html = html.replace(/site\.js\?v=\d+/, 'site.js?v=9');

  return html;
}

function replaceNavFooter(html) {
  // Replace nav block — from <nav class="nav"> to </nav> (first occurrence)
  html = html.replace(/<nav class="nav"[\s\S]*?<\/nav>/, headerHtml.trim());

  // Replace footer block
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footerHtml.trim());

  return html;
}

function fixCtAs(html) {
  // Migrate any remaining absolute app.bryte.app references to same-origin paths
  html = html.replace(/https:\/\/app\.bryte\.app\/login/g, '/login');
  html = html.replace(/https:\/\/app\.bryte\.app\/signup/g, '/signup');
  html = html.replace(/https:\/\/app\.bryte\.app\//g, '/app/');

  // "Open app" / "Open the app" links → app SPA
  html = html.replace(/href="\.\.\/index\.html"/g, 'href="/app/"');

  // Sign in buttons that point to Demo.html → actual login
  html = html.replace(
    /<a([^>]*?)class="([^"]*btn-ghost[^"]*)"([^>]*)href="\/?Demo\.html"([^>]*)>Sign in<\/a>/g,
    '<a$1class="$2"$3href="/login"$4>Sign in</a>'
  );
  html = html.replace(
    /<a([^>]*?)href="\/?Demo\.html"([^>]*)class="([^"]*btn-ghost[^"]*)"([^>]*)>Sign in<\/a>/g,
    '<a$1href="/login"$2class="$3"$4>Sign in</a>'
  );

  // Trial / signup CTAs → /signup
  const ctaCopy = [
    'Start free trial',
    'Get started',
    'Sign up',
    'Start for free',
    'Try free for 30 days',
    'Start 30-day trial',
    'Start your free trial',
  ];
  for (const copy of ctaCopy) {
    const re = new RegExp(`href="\\/?(Pricing\\.html|Demo\\.html)"([^>]*)>${copy}`, 'g');
    html = html.replace(re, `href="/signup"$2>${copy}`);
  }

  return html;
}

function fixPerformance(html) {
  // Add loading="lazy" to all images that don't already have it and aren't in the hero
  html = html.replace(/<img(?![^>]*loading=)(?![^>]*class="hero)/g, '<img loading="lazy"');

  // Ensure all img tags have an alt attribute (add empty alt if missing — will log for manual review)
  const imgMissingAlt = /<img(?![^>]*\balt=)[^>]*>/g;
  html = html.replace(imgMissingAlt, (match) => {
    console.warn('  ⚠  img missing alt:', match.substring(0, 80));
    return match.replace('<img', '<img alt=""');
  });

  return html;
}

function addActiveClass(html, pageFile) {
  // Mark the active nav link based on current page
  // Add active class to the matching nav link
  const navLinkRe = new RegExp(`href="${pageFile}"(?![^>]*class)`,'g');
  // More robust: mark via data attribute approach in JS, or just add aria-current
  html = html.replace(
    new RegExp(`(<a[^>]*href="${pageFile}"[^>]*>)`, 'g'),
    (match) => {
      if (match.includes('aria-current')) return match;
      return match.replace('<a ', '<a aria-current="page" ');
    }
  );
  return html;
}

function processPage(page) {
  const filePath = join(__dir, page.file);
  let html = readFileSync(filePath, 'utf8');

  html = injectHead(html, page);
  html = replaceNavFooter(html);
  html = fixCtAs(html);
  html = fixPerformance(html);
  html = addActiveClass(html, page.file);

  writeFileSync(filePath, html, 'utf8');
  console.log(`  ✓  ${page.file}`);
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('Building Bryte marketing pages…\n');
for (const page of pages) {
  try {
    processPage(page);
  } catch (err) {
    console.error(`  ✗  ${page.file}:`, err.message);
  }
}
console.log('\nDone.');
