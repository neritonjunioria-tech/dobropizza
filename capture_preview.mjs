import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1250, deviceScaleFactor: 1.5 });

  const scriptContent = fs.readFileSync('generate_pdf_guide.mjs', 'utf8');
  const startMarker = 'const htmlContent = `';
  const endMarker = '`;\n\n(async () => {';
  const startIndex = scriptContent.indexOf(startMarker) + startMarker.length;
  const endIndex = scriptContent.indexOf(endMarker);
  let html = scriptContent.substring(startIndex, endIndex);

  // Read images
  const readBase64 = (relPath) => {
    if (fs.existsSync(relPath)) {
      const buf = fs.readFileSync(relPath);
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    return '';
  };
  const logoBase64 = readBase64('../logo dobro.png');
  const imgDash = readBase64('public/screenshots/dash_cmv.png');
  const imgFichas = readBase64('public/screenshots/fichas_cards.png');
  const imgInsumos = readBase64('public/screenshots/insumos_tabela.png');
  const imgModal = readBase64('public/screenshots/modal_ficha.png');

  html = html.replace('${logoBase64 ? `<img src="${logoBase64}" alt="Dobro Pizzas" />` : \'\'}', `<img src="${logoBase64}" alt="Dobro Pizzas" />`);
  html = html.replace(/\$\{logoBase64 \? \`<img src="\$\{logoBase64\}" class="logo" \/>\` : \'\'\}/g, `<img src="${logoBase64}" class="logo" />`);
  html = html.replace('${imgDash ? `<img src="${imgDash}" alt="Dashboard CMV Dobro Pizzas" />` : \'\'}', `<img src="${imgDash}" alt="Dashboard CMV Dobro Pizzas" />`);
  html = html.replace('${imgFichas ? `<img src="${imgFichas}" alt="Fichas Técnicas Dobro Pizzas" />` : \'\'}', `<img src="${imgFichas}" alt="Fichas Técnicas Dobro Pizzas" />`);
  html = html.replace('${imgInsumos ? `<img src="${imgInsumos}" alt="Tabela de Insumos Dobro Pizzas" />` : \'\'}', `<img src="${imgInsumos}" alt="Tabela de Insumos Dobro Pizzas" />`);
  html = html.replace('${imgModal ? `<img src="${imgModal}" alt="Modal Ficha Técnica Dobro Pizzas" />` : \'\'}', `<img src="${imgModal}" alt="Modal Ficha Técnica Dobro Pizzas" />`);

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const artifactDir = 'C:/Users/herek/.gemini/antigravity-ide/brain/472aca46-a613-4652-b450-58713165c8c0';
  const pages = await page.$$('.page');
  
  if (pages.length > 0) {
    await pages[0].screenshot({ path: path.join(artifactDir, 'manual_capa.png') });
  }
  if (pages.length > 2) {
    // Page 3 (Aba 1 e 2 com screenshots reais)
    await pages[2].screenshot({ path: path.join(artifactDir, 'manual_pagina3_telas.png') });
  }
  if (pages.length > 3) {
    // Page 4 (Aba 3 e Modal com screenshots reais)
    await pages[3].screenshot({ path: path.join(artifactDir, 'manual_pagina4_telas.png') });
  }

  console.log('Preview screenshots with real system images captured successfully!');
  await browser.close();
})();
