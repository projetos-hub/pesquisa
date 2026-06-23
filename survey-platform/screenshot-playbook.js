const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // A4 portrait viewport at 96dpi: 210mm = ~794px, 297mm = ~1123px
  await page.setViewportSize({ width: 794, height: 1123 });

  const htmlPath = path.resolve(__dirname, '../docs/playbook-visual.html');
  const fileUrl = 'file:///' + htmlPath.split('\\').join('/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const outDir = path.resolve(__dirname, '../docs/playbook-preview');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // Screenshot of full cover (first "page")
  const cover = await page.$('.cover');
  await cover.screenshot({ path: path.join(outDir, '00-cover.png') });

  // Screenshot of each section start
  const sections = await page.$$('section');
  for (let i = 0; i < sections.length; i++) {
    await sections[i].screenshot({ path: path.join(outDir, `${String(i+1).padStart(2,'0')}-section.png`) });
  }

  await browser.close();
  console.log(`Screenshots saved to: ${outDir}`);
  console.log(`Files: ${fs.readdirSync(outDir).join(', ')}`);
})();
