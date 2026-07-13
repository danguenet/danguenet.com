import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const browser = await chromium.launch();

const renderSvg = async ({
  source,
  output,
  width,
  height,
  background = 'transparent',
}) => {
  const svg = await readFile(resolve(projectRoot, source), 'utf8');
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`
    <!doctype html>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: ${background}; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
    ${svg}
  `);
  await page.screenshot({
    path: resolve(projectRoot, output),
    omitBackground: background === 'transparent',
  });
  await page.close();
};

try {
  await renderSvg({
    source: 'public/favicon.svg',
    output: 'public/favicon-32.png',
    width: 32,
    height: 32,
  });
  await renderSvg({
    source: 'public/favicon.svg',
    output: 'public/apple-touch-icon.png',
    width: 180,
    height: 180,
    background: '#06100f',
  });
  await renderSvg({
    source: 'public/social-card.svg',
    output: 'public/social-card.png',
    width: 1200,
    height: 630,
    background: '#06100f',
  });
} finally {
  await browser.close();
}
