import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:3001/preview-fichas...');
  await page.goto('http://localhost:3001/preview-fichas', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const imgDir = path.resolve('public/screenshots');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }

  // 1. Dashboard Tab Screenshot
  console.log('Capturing Dashboard screenshot...');
  await page.screenshot({ path: path.join(imgDir, 'dash_cmv.png') });

  // 2. Click on "Fichas Técnicas" tab
  console.log('Switching to Fichas Técnicas tab...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Fichas Técnicas (')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(imgDir, 'fichas_cards.png') });

  // 3. Click on "Insumos & Matérias-Primas" tab
  console.log('Switching to Insumos tab...');
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Insumos & Matérias-Primas')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(imgDir, 'insumos_tabela.png') });

  // 4. Open Modal "Nova Ficha Técnica"
  console.log('Opening Nova Ficha Técnica modal...');
  const buttons3 = await page.$$('button');
  for (const btn of buttons3) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.includes('Nova Ficha Técnica')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(imgDir, 'modal_ficha.png') });

  console.log('All 4 system screenshots captured successfully in public/screenshots!');
  await browser.close();
})();
