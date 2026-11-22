/**
 * Local-only M1 visual review: creates disposable review accounts through the
 * local API, captures the authenticated My Day screen, and records short UI
 * walkthroughs. This script refuses non-local URLs and is never used by build.
 */
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webUrl = process.env.ND_M1_WEB_URL ?? 'http://localhost:5174';
const apiUrl = process.env.ND_M1_API_URL ?? 'http://localhost:4000/api';
const outputRoot = path.join(repoRoot, 'docs', 'ux-audit', 'm1');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'namma-dina-m1-review-'));
const isLocal = (value) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
if (!isLocal(webUrl) || !isLocal(apiUrl)) throw new Error('M1 review can only run against localhost.');

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 412, height: 915 },
];
const locales = ['en', 'kn'];
const states = ['empty', 'populated'];
const themes = ['night', 'day'];
const errors = [];
const screenshots = [];
const audits = [];
const reviewClientIps = {
  empty: `203.0.113.${Math.floor(Math.random() * 220) + 20}`,
  populated: `198.51.100.${Math.floor(Math.random() * 220) + 20}`,
};
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

async function createReviewAccount(state) {
  const context = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': reviewClientIps[state] } });
  const request = context.request;
  const csrfResponse = await request.get(`${apiUrl}/auth/csrf`);
  if (!csrfResponse.ok()) throw new Error(`Local CSRF setup failed (${csrfResponse.status()}).`);
  const { csrfToken } = await csrfResponse.json();
  const headers = { 'X-CSRF-Token': csrfToken };
  const registered = await request.post(`${apiUrl}/auth/register`, {
    headers,
    data: {
      email: `m1-review-${state}-${randomUUID()}@example.test`,
      password: `M1-Review-${randomUUID()}-!`,
      displayName: state === 'empty' ? 'M1 Review Empty' : 'M1 Review Sample',
    },
  });
  if (!registered.ok()) throw new Error(`Local review account setup failed (${registered.status()}).`);
  const profile = await request.patch(`${apiUrl}/users/profile`, {
    headers,
    data: { onboardingDone: true, timezone: 'Asia/Kolkata' },
  });
  if (!profile.ok()) throw new Error(`Local review profile setup failed (${profile.status()}).`);
  const assistantSettings = await request.patch(`${apiUrl}/assistant/settings`, { headers, data: { tourCompleted: true } });
  if (!assistantSettings.ok()) throw new Error(`Local review assistant setup failed (${assistantSettings.status()}).`);

  if (state === 'populated') {
    const post = async (route, data) => {
      const response = await request.post(`${apiUrl}${route}`, { headers, data });
      if (!response.ok()) throw new Error(`Local demo seed failed for ${route} (${response.status()}).`);
      return (await response.json()).data;
    };
    await post('/tasks', {
      title: 'Review the first project outline', priority: 'HIGH', scheduledMinutes: 45,
      scheduledStart: `${today}T04:00:00.000Z`, dueAt: `${today}T13:00:00.000Z`,
    });
    await post('/tasks', { title: 'Reply to Mira', priority: 'MEDIUM', scheduledMinutes: 15 });
    const habit = await post('/habits', {
      name: 'Morning walk', frequency: 'DAILY', targetValue: 1, targetUnit: 'walk',
      flexible: true, isActive: true, startDate: today,
    });
    await post('/habit-logs', { habitId: habit.id, date: today, value: 1, note: null });
    await post('/water', { date: today, amountMl: 750 });
  }

  const storagePath = path.join(tempRoot, `${state}.storage.json`);
  await context.storageState({ path: storagePath });
  await context.close();
  return storagePath;
}

async function measure(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('h1,h2,h3,p,span,button,label,a,small,.eyebrow,.muted')]
      .filter((element) => element.textContent?.trim() && element.getClientRects().length);
    const sizes = visible.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)).filter(Number.isFinite);
    return {
      title: document.title,
      pageHeading: document.querySelector('.dashboard-heading h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      viewport: [innerWidth, innerHeight],
      document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      smallestTextPx: sizes.length ? Math.min(...sizes) : null,
      textBelow12px: sizes.filter((size) => size < 12).length,
      smallText: visible.map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 72) ?? '',
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      })).filter((item) => Number.isFinite(item.size) && item.size < 12),
      overflowingElements: [...document.querySelectorAll('body *')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      }).filter((item) => item.right > innerWidth + 1 || (item.scrollWidth > item.clientWidth + 1 && item.clientWidth > 0)).slice(0, 16),
      fonts: getComputedStyle(document.body).fontFamily,
      notoKannadaLoaded: document.fonts.check('16px "Noto Sans Kannada"', 'ನಮ್ಮ ದಿನ'),
      theme: document.documentElement.dataset.theme,
    };
  });
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const statesData = {
    empty: await createReviewAccount('empty'),
    populated: await createReviewAccount('populated'),
  };
  for (const state of states) {
    for (const locale of locales) {
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          locale: locale === 'kn' ? 'kn-IN' : 'en-IN',
          colorScheme: 'dark',
          reducedMotion: 'reduce',
          serviceWorkers: 'block',
          storageState: statesData[state],
          recordVideo: { dir: path.join(tempRoot, 'videos'), size: { width: viewport.width, height: viewport.height } },
          extraHTTPHeaders: { 'X-Forwarded-For': reviewClientIps[state] },
        });
        await context.addInitScript((language) => {
          localStorage.setItem('nd_language', language);
          localStorage.setItem('nd_theme', 'night');
        }, locale);
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push({ state, locale, viewport: viewport.name, kind: 'page', message: error.message }));
        page.on('console', (message) => {
          if (message.type() === 'error' && !/font|woff/i.test(message.text())) {
            errors.push({ state, locale, viewport: viewport.name, kind: 'console', message: message.text().slice(0, 240), location: message.location() });
          }
        });
        page.on('response', (response) => {
          if (response.status() >= 500) errors.push({ state, locale, viewport: viewport.name, kind: 'http', status: response.status(), url: response.url() });
        });
        const video = page.video();
        try {
          await page.goto(`${webUrl}/app/day`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 15000 });
          await page.locator('.dashboard-heading h1').waitFor({ state: 'visible', timeout: 15000 });
          await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
          await page.waitForTimeout(350);

          for (const theme of themes) {
            if (theme === 'day') {
              await page.locator('.theme-toggle').click();
              await page.locator('html[data-theme="day"]').waitFor({ state: 'attached', timeout: 5000 });
            }
            const metric = await measure(page);
            const shot = path.join(outputRoot, 'screenshots', state, viewport.name, locale, `${theme}.png`);
            await mkdir(path.dirname(shot), { recursive: true });
            await page.screenshot({ path: shot, animations: 'disabled' });
            screenshots.push({ state, locale, viewport: viewport.name, theme, path: path.relative(repoRoot, shot).replaceAll('\\', '/'), ...metric });

            const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
            audits.push({ state, locale, viewport: viewport.name, theme, violations: axe.violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.help,
              count: violation.nodes.length,
              nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary?.slice(0, 360), html: node.html.slice(0, 220) })),
            })) });
          }

          if (viewport.name === 'mobile') await page.evaluate(() => window.scrollTo(0, 240));
          await page.waitForTimeout(250);
          await page.locator('.quick-add-trigger').click();
          await page.locator('.quick-add-dialog').waitFor({ state: 'visible', timeout: 5000 });
          await page.waitForTimeout(350);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(250);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);
        } catch (error) {
          errors.push({ state, locale, viewport: viewport.name, kind: 'capture', message: error instanceof Error ? error.message : String(error) });
        } finally {
          await page.close();
          await context.close();
          if (video) {
            const source = await video.path();
            const target = path.join(outputRoot, 'videos', `${state}-${viewport.name}-${locale}.webm`);
            await mkdir(path.dirname(target), { recursive: true });
            await copyFile(source, target);
          }
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: webUrl,
    dimensions: viewports,
    screenshotCount: screenshots.length,
    videoCount: states.length * locales.length * viewports.length,
    stateCount: states.length,
    localeCount: locales.length,
    themeCount: themes.length,
    screenshots,
    axeAudits: audits,
    pageErrors: errors,
    overflow: screenshots.filter((shot) => shot.horizontalOverflow).map((shot) => ({ state: shot.state, locale: shot.locale, viewport: shot.viewport, theme: shot.theme, width: shot.document[0] })),
    smallText: screenshots.filter((shot) => shot.textBelow12px > 0).map((shot) => ({ state: shot.state, locale: shot.locale, viewport: shot.viewport, theme: shot.theme, count: shot.textBelow12px, min: shot.smallestTextPx })),
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, 'review-metrics.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    screenshotCount: report.screenshotCount,
    videoCount: report.videoCount,
    pageErrors: errors.length,
    overflowCount: report.overflow.length,
    smallTextCount: report.smallText.length,
    axeViolationCounts: audits.map((audit) => audit.violations.reduce((sum, violation) => sum + violation.count, 0)),
    report: path.relative(repoRoot, path.join(outputRoot, 'review-metrics.json')),
  }, null, 2));
} finally {
  await browser.close();
  await rm(tempRoot, { recursive: true, force: true });
}
