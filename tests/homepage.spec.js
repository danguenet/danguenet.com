import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    }),
  );
});

test('homepage renders cleanly and meets automated accessibility rules', async ({
  page,
}) => {
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Daniel Guenet | GTM Systems Builder');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'I build systems that help GTM teams scale.',
  );
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(
    'Building the systems behind better GTM.',
  );
  await expect(page.getByRole('main')).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test('publishes complete search and social metadata', async ({
  page,
  request,
}) => {
  const description =
    'Daniel Guenet builds practical GTM systems that connect strategy, workflows, data, automation, and AI so revenue teams can scale with clarity.';

  await page.goto('/');

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    description,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://danguenet.com/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://danguenet.com/social-card.png',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'sizes',
    '180x180',
  );

  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(structuredData['@type']).toBe('ProfilePage');
  expect(structuredData.mainEntity.name).toBe('Daniel Guenet');

  const socialCard = await request.get('/social-card.png');
  expect(socialCard.ok()).toBe(true);
  expect(socialCard.headers()['content-type']).toBe('image/png');

  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain('sitemap-0.xml');
});

test('workflow step controls expose and update their state', async ({
  page,
}) => {
  await page.goto('/');

  const finalStep = page.getByRole('button', {
    name: 'Select step 06: Improve continuously',
  });
  await finalStep.click();
  await expect(finalStep).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-active-label]')).toHaveText(
    'Improve continuously',
  );
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const hasNoOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(hasNoOverflow).toBe(true);
});

test('responsive refinements render consistently at every size', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ];

  await page.setViewportSize(viewports[0]);
  await page.goto('/');

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const link of await page.locator('.hero-links a').all()) {
      const linkBox = await link.boundingBox();
      const iconBox = await link.locator('svg').boundingBox();
      expect(linkBox).not.toBeNull();
      expect(iconBox).not.toBeNull();
      if (viewport.width <= 700) {
        expect(
          Math.abs(
            linkBox.x + linkBox.width / 2 - (iconBox.x + iconBox.width / 2),
          ),
        ).toBeLessThan(1);
      }
      expect(
        Math.abs(
          linkBox.y + linkBox.height / 2 - (iconBox.y + iconBox.height / 2),
        ),
      ).toBeLessThan(1);
    }

    const phrases = await page.locator('.closing-phrase').all();
    const phraseBoxes = await Promise.all(
      phrases.map((phrase) => phrase.boundingBox()),
    );
    expect(phraseBoxes).toHaveLength(3);
    expect(
      phraseBoxes[1].y - (phraseBoxes[0].y + phraseBoxes[0].height),
    ).toBeGreaterThan(10);
    expect(
      phraseBoxes[2].y - (phraseBoxes[1].y + phraseBoxes[1].height),
    ).toBeGreaterThan(10);
  }

  await page.setViewportSize(viewports[0]);
  await expect(page.locator('.footer-grid > p')).toBeHidden();
  await page.setViewportSize(viewports[2]);
  await expect(page.locator('.footer-grid > p')).toBeVisible();
  await expect(page.locator('.hero-links a').first()).toContainText('LinkedIn');
});
