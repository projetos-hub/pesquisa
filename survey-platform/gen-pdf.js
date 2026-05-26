const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // A4 at 96dpi = 794x1123px — força paginação correta
  await page.setViewportSize({ width: 794, height: 1123 });

  const htmlPath = path.resolve(__dirname, '../docs/playbook-visual.html');
  const fileUrl = 'file:///' + htmlPath.split('\\').join('/');

  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const pdfPath = path.resolve(__dirname, '../docs/playbook-visual.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });

  await browser.close();
  console.log('PDF gerado em:', pdfPath);
})();
