// Builds site/index.html from site/source.html by injecting the official logo as inline SVG symbols.
const fs = require('fs');
const path = require('path');
const site = path.join(__dirname, 'site');
const svg = fs.readFileSync(path.join(site, 'img', 'logo.svg'), 'utf8');
const VB = svg.match(/viewBox="([^"]+)"/)[1];
const D = svg.match(/ d="([^"]+)"/)[1];
const symbols = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="lg" viewBox="${VB}"><path fill-rule="evenodd" d="${D}"/></symbol>
  <symbol id="rm" viewBox="112 490 192 152"><path fill-rule="evenodd" d="${D}"/></symbol>
</svg>`;
const src = fs.readFileSync(path.join(site, 'source.html'), 'utf8');
if (!src.includes('<!--LOGO_SYMBOLS-->')) throw new Error('marcador ausente');
fs.writeFileSync(path.join(site, 'index.html'), src.replace('<!--LOGO_SYMBOLS-->', symbols));
console.log('index.html gerado', Math.round(fs.statSync(path.join(site, 'index.html')).size / 1024) + 'KB');
