import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Carrega o logotipo oficial
const logoPath = path.resolve('..', 'logo dobro.png');
let logoBase64 = '';
if (fs.existsSync(logoPath)) {
  const buf = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
}

// Carrega os 4 screenshots reais do sistema Dobro Pizzas
const readBase64 = (relPath) => {
  if (fs.existsSync(relPath)) {
    const buf = fs.readFileSync(relPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
  return '';
};

const imgDash = readBase64('public/screenshots/dash_cmv.png');
const imgFichas = readBase64('public/screenshots/fichas_cards.png');
const imgInsumos = readBase64('public/screenshots/insumos_tabela.png');
const imgModal = readBase64('public/screenshots/modal_ficha.png');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual Operacional - Ficha Técnica & CMV Dobro Pizzas</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #1c1917;
      background: #ffffff;
      font-size: 9pt;
      line-height: 1.45;
    }

    .page {
      page-break-after: always;
      position: relative;
      min-height: 265mm;
      padding-bottom: 8mm;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Identidade Oficial Dobro Pizzas */
    :root {
      --brand-green: #083d07;
      --brand-green-light: #0b520a;
      --brand-gold: #d5af7a;
      --brand-gold-dark: #9e7843;
      --brand-cream: #fdfbf7;
      --brand-cream-border: #ede6dc;
      --stone-50: #fafaf9;
      --stone-100: #f5f5f4;
      --stone-200: #e7e5e4;
      --stone-600: #57534e;
      --stone-800: #292524;
      --stone-900: #1c1917;
    }

    /* HEADER FIXO DO TOPO DE CADA PÁGINA */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 7px;
      margin-bottom: 14px;
      border-bottom: 1.5px solid var(--brand-gold);
    }
    .doc-header .left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .doc-header img.logo {
      height: 32px;
      width: auto;
      object-fit: contain;
    }
    .doc-header .brand-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: var(--brand-green);
      letter-spacing: -0.3px;
    }
    .doc-header .brand-sub {
      font-size: 6.8pt;
      font-weight: 600;
      color: var(--brand-gold-dark);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .doc-header .right-badge {
      font-size: 7.2pt;
      font-weight: 700;
      background: var(--brand-cream);
      border: 1px solid var(--brand-gold);
      color: var(--brand-green);
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* CAPA */
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 255mm;
      text-align: left;
      padding: 10px 0;
    }
    .cover-top {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 3px solid var(--brand-green);
      padding-bottom: 16px;
    }
    .cover-top img {
      height: 60px;
    }
    .cover-hero {
      margin: 25px 0;
    }
    .cover-tag {
      display: inline-block;
      background: var(--brand-green);
      color: var(--brand-gold);
      font-size: 8pt;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 14px;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 900;
      line-height: 1.15;
      color: var(--brand-green);
      letter-spacing: -0.8px;
      margin-bottom: 12px;
    }
    .cover-title span {
      color: var(--brand-gold-dark);
    }
    .cover-desc {
      font-size: 11pt;
      color: var(--stone-600);
      max-width: 92%;
      line-height: 1.5;
    }
    .cover-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .cover-card {
      background: var(--brand-cream);
      border: 1px solid var(--brand-cream-border);
      border-left: 4px solid var(--brand-green);
      padding: 10px 12px;
      border-radius: 8px;
    }
    .cover-card-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13pt;
      font-weight: 800;
      color: var(--brand-green);
      display: block;
    }
    .cover-card-title {
      font-size: 8pt;
      font-weight: 700;
      color: var(--stone-800);
      margin-top: 2px;
    }
    .cover-card-desc {
      font-size: 7.2pt;
      color: var(--stone-600);
      margin-top: 2px;
      line-height: 1.35;
    }
    .cover-footer {
      border-top: 1px solid var(--stone-200);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.8pt;
      color: var(--stone-600);
    }
    .cover-footer strong {
      color: var(--brand-green);
    }

    /* SEÇÕES E TIPOGRAFIA */
    h2.section-title {
      font-size: 13pt;
      font-weight: 900;
      color: var(--brand-green);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.3px;
    }
    h2.section-title::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 18px;
      background: var(--brand-gold);
      border-radius: 3px;
    }
    p.lead-text {
      font-size: 8.8pt;
      color: var(--stone-600);
      margin-bottom: 12px;
      line-height: 1.45;
    }

    /* CARDS DE DESTAQUE */
    .card {
      background: #ffffff;
      border: 1px solid var(--stone-200);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .card-highlight {
      background: var(--brand-cream);
      border: 1px solid var(--brand-cream-border);
      border-left: 4px solid var(--brand-green);
    }
    .card-alert {
      background: #fff8f6;
      border: 1px solid #ffdcd6;
      border-left: 4px solid #e11d48;
    }

    /* SCREENSHOT MOCKUP DO SISTEMA */
    .system-mockup {
      background: #ffffff;
      border: 1.5px solid var(--stone-200);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      margin-bottom: 12px;
    }
    .system-mockup-header {
      background: #f4efe6;
      border-bottom: 1px solid #e5dcce;
      padding: 5px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .system-mockup-dots {
      display: flex;
      gap: 4px;
    }
    .system-mockup-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .system-mockup-title {
      font-size: 7.2pt;
      font-weight: 700;
      color: var(--brand-green);
      font-family: 'JetBrains Mono', monospace;
    }
    .system-mockup img {
      width: 100%;
      height: auto;
      display: block;
      border-bottom: 1px solid var(--stone-200);
    }
    .system-mockup-caption {
      padding: 6px 10px;
      font-size: 7.2pt;
      color: var(--stone-600);
      background: #fafaf9;
      line-height: 1.35;
    }

    /* TABELAS */
    table.custom-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin: 10px 0 14px 0;
      border: 1px solid var(--stone-200);
      border-radius: 8px;
      overflow: hidden;
    }
    table.custom-table th {
      background: #f7f5f0;
      color: var(--brand-green);
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.5px;
      padding: 7px 9px;
      text-align: left;
      border-bottom: 1px solid var(--stone-200);
    }
    table.custom-table td {
      padding: 6px 9px;
      border-bottom: 1px solid #f0ede6;
      color: var(--stone-800);
      vertical-align: middle;
    }
    table.custom-table tr:last-child td {
      border-bottom: none;
    }
    table.custom-table tr:nth-child(even) td {
      background: #faf8f5;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .tag-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .tag-green { background: #e6f4ea; color: #137333; border: 1px solid #ceead6; }
    .tag-amber { background: #fef7e0; color: #b06000; border: 1px solid #feefc3; }
    .tag-rose { background: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; }

    /* PASSOS */
    .step-box {
      display: flex;
      gap: 10px;
      padding: 8px 10px;
      background: #ffffff;
      border: 1px solid var(--stone-200);
      border-radius: 8px;
      margin-bottom: 7px;
      align-items: flex-start;
    }
    .step-number {
      width: 24px;
      height: 24px;
      background: var(--brand-green);
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 800;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-family: 'JetBrains Mono', monospace;
    }
    .step-content {
      flex: 1;
    }
    .step-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: var(--brand-green);
      margin-bottom: 2px;
    }
    .step-desc {
      font-size: 7.8pt;
      color: var(--stone-600);
      line-height: 1.35;
    }
    .step-tip {
      margin-top: 3px;
      font-size: 7.2pt;
      color: var(--brand-gold-dark);
      font-weight: 600;
      background: var(--brand-cream);
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
    }

    /* FOOTER DA PÁGINA */
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #8c827a;
      border-top: 1px solid #ebe5dc;
      padding-top: 5px;
    }
  </style>
</head>
<body>

  <!-- ============================================================ -->
  <!-- PÁGINA 1: CAPA OFICIAL DOBRO PIZZAS                          -->
  <!-- ============================================================ -->
  <div class="page cover">
    <div class="cover-top">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Dobro Pizzas" />` : ''}
      <div>
        <div style="font-size: 15pt; font-weight: 900; color: var(--brand-green); letter-spacing: -0.5px;">DOBRO PIZZAS</div>
        <div style="font-size: 7.8pt; font-weight: 700; color: var(--brand-gold-dark); text-transform: uppercase; letter-spacing: 1px;">Excelência Artesanal & Gestão Estratégica</div>
      </div>
    </div>

    <div class="cover-hero">
      <div class="cover-tag">Manual Operacional de Gestão</div>
      <h1 class="cover-title">Ficha Técnica &<br><span>Controle de CMV</span></h1>
      <p class="cover-desc">
        O guia oficial da <strong>Dobro Pizzas</strong> para padronização milimétrica de receitas, eliminação de desperdício na bancada, inteligência de compras e garantia de margem de lucro real por pizza vendida.
      </p>

      <div class="cover-grid">
        <div class="cover-card">
          <span class="cover-card-num">25% a 32%</span>
          <div class="cover-card-title">CMV Meta de Ouro</div>
          <div class="cover-card-desc">Faixa ideal de custo de insumos para máxima rentabilidade em pizzaria delivery.</div>
        </div>
        <div class="cover-card">
          <span class="cover-card-num">100% Preciso</span>
          <div class="cover-card-title">Preço Ideal Sugerido</div>
          <div class="cover-card-desc">O sistema calcula na hora o preço de venda para cravar 70% de margem bruta.</div>
        </div>
        <div class="cover-card">
          <span class="cover-card-num">1 Clique</span>
          <div class="cover-card-title">Cascata de Custos</div>
          <div class="cover-card-desc">Subiu a mussarela? Altere uma vez e todas as pizzas recalculam juntas.</div>
        </div>
      </div>
    </div>

    <div>
      <div class="card card-highlight">
        <div style="font-size: 8.5pt; font-weight: 800; color: var(--brand-green); margin-bottom: 2px;">
          📌 Por que este documento é confidencial e prioritário?
        </div>
        <div style="font-size: 7.8pt; color: var(--stone-600); line-height: 1.4;">
          A maior causa de aperto financeiro em pizzarias é o <em>"faturamento cego"</em>: vender centenas de pizzas no mês achando que está lucrando, enquanto 40 gramas a mais de queijo por pizza devoram o lucro líquido no final do expediente. A ficha técnica é a blindagem financeira da Dobro Pizzas.
        </div>
      </div>

      <div class="cover-footer">
        <div><strong>Dobro Pizzas</strong> • Documento de Diretrizes Internas v2.0</div>
        <div>Uso Restrito • Gestão & Cozinha</div>
      </div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PÁGINA 2: PARA QUE SERVE & O CÁLCULO DE CMV                 -->
  <!-- ============================================================ -->
  <div class="page">
    <div class="doc-header">
      <div class="left">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
        <div>
          <div class="brand-title">Dobro Pizzas</div>
          <div class="brand-sub">Manual de Ficha Técnica</div>
        </div>
      </div>
      <div class="right-badge">Capítulo 1 • Fundamentos</div>
    </div>

    <h2 class="section-title">1. Para Que Serve a Ficha Técnica?</h2>
    <p class="lead-text">
      A ficha técnica é o registro oficial da receita de cada pizza da Dobro Pizzas, cruzando <strong>gramatura exata de ingredientes</strong>, <strong>custo de embalagem</strong>, <strong>custo de forno</strong> e <strong>preço de venda</strong>.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <div class="card" style="border-top: 3px solid #c5221f;">
        <div style="font-size: 8.3pt; font-weight: 800; color: #c5221f; margin-bottom: 4px;">❌ O ERRO: Sem Ficha Técnica</div>
        <ul style="font-size: 7.6pt; color: var(--stone-600); padding-left: 14px; line-height: 1.45;">
          <li>Preço definido no "chute" ou copiando concorrente que tem custos diferentes.</li>
          <li>Pizzaiolo coloca recheio no "olhômetro" (terça-feira vem leve, sábado pesada).</li>
          <li>Desperdício invisível de 30g a 50g de queijo por pizza sem ninguém notar.</li>
          <li>Aumento de insumos do fornecedor passa batido até o caixa fechar no vermelho.</li>
        </ul>
      </div>

      <div class="card" style="border-top: 3px solid var(--brand-green);">
        <div style="font-size: 8.3pt; font-weight: 800; color: var(--brand-green); margin-bottom: 4px;">✅ A EXCELÊNCIA: Com Ficha Técnica Dobro Pizzas</div>
        <ul style="font-size: 7.6pt; color: var(--stone-600); padding-left: 14px; line-height: 1.45;">
          <li>Lucro líquido previsto no sistema é exatamente o que entra no bolso.</li>
          <li>Padrão 100% idêntico: o cliente come a mesma pizza saborosa sempre.</li>
          <li>Balança digital na bancada garante peso e sabor equilibrado da massa.</li>
          <li>O sistema avisa na hora se o custo ultrapassou a margem de segurança.</li>
        </ul>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 14px;">A Fórmula do CMV (Custo de Mercadoria Vendida)</h2>
    <p class="lead-text">
      O CMV indica qual porcentagem da receita da pizza foi gasta estritamente para produzi-la e embalá-la.
    </p>

    <div class="card card-highlight" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;">
      <div class="font-mono" style="font-size: 10.5pt; font-weight: 800; color: var(--brand-green);">
        % CMV = ( Custo Total / Preço de Venda ) × 100
      </div>
      <div style="text-align: right; font-size: 7.2pt; color: var(--stone-600);">
        <strong>Custo Total</strong> = Insumos + Embalagem (R$ 2,90) + Forno/Gás (R$ 1,50)
      </div>
    </div>

    <div style="margin-top: 10px;">
      <div style="font-size: 8.2pt; font-weight: 800; color: var(--stone-800); margin-bottom: 4px;">
        O Semáforo de Saúde do CMV na Dobro Pizzas:
      </div>

      <table class="custom-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Faixa de CMV</th>
            <th>Diagnóstico & Ação Recomendada</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="tag-pill tag-green">🟢 ÓTIMO</span></td>
            <td class="font-mono"><strong>Abaixo de 30%</strong></td>
            <td>Margem excelente (acima de 70% bruto). Produto altamente lucrativo; ideal para impulsionar em anúncios e destaques do cardápio.</td>
          </tr>
          <tr>
            <td><span class="tag-pill tag-amber">🟡 PADRÃO</span></td>
            <td class="font-mono"><strong>30% a 38%</strong></td>
            <td>Margem saudável aceitável para sabores clássicos (ex: Calabresa, Frango c/ Catupiry). Manter vigilância na pesagem da bancada.</td>
          </tr>
          <tr>
            <td><span class="tag-pill tag-rose">🔴 ALERTA</span></td>
            <td class="font-mono"><strong>Acima de 38%</strong></td>
            <td>Risco de margem comprimida. Exige ajuste de preço ou reengenharia da proporção de queijos nobres para recuperar rentabilidade.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card card-alert" style="margin-top: 8px;">
      <div style="font-size: 8.2pt; font-weight: 800; color: #c5221f; margin-bottom: 2px;">
        ⚠️ O Impacto de 40 Gramas de Queijo a Mais:
      </div>
      <div style="font-size: 7.6pt; color: var(--stone-600); line-height: 1.4;">
        A R$ 42,00 o kg da mussarela (R$ 0,042/g), colocar 40g a mais em cada pizza custa <strong>R$ 1,68 por unidade</strong>. Em uma operação de 600 pizzas/mês, isso representa <strong>R$ 1.008,00 perdidos todo mês</strong> — valor suficiente para cobrir despesas de embalagens ou custos de forno!
      </div>
    </div>

    <div class="page-footer">
      <div>Dobro Pizzas • Manual de Gestão de CMV</div>
      <div>Página 2</div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PÁGINA 3: TELAS REAIS DO SISTEMA: DASHBOARD & FICHAS        -->
  <!-- ============================================================ -->
  <div class="page">
    <div class="doc-header">
      <div class="left">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
        <div>
          <div class="brand-title">Dobro Pizzas</div>
          <div class="brand-sub">Manual de Ficha Técnica</div>
        </div>
      </div>
      <div class="right-badge">Capítulo 2 • Painel em Operação</div>
    </div>

    <h2 class="section-title">2. Telas Reais do Painel Dobro Pizzas</h2>
    <p class="lead-text">
      Veja abaixo como o módulo funciona visualmente dentro do painel administrativo, disponível no menu <strong>"Ficha Técnica & CMV"</strong>:
    </p>

    <!-- SCREENSHOT 1: DASHBOARD -->
    <div class="system-mockup">
      <div class="system-mockup-header">
        <div class="system-mockup-dots">
          <span class="system-mockup-dot" style="background:#ff5f56;"></span>
          <span class="system-mockup-dot" style="background:#ffbd2e;"></span>
          <span class="system-mockup-dot" style="background:#27c93f;"></span>
        </div>
        <div class="system-mockup-title">Aba 1: Dashboard CMV & Matriz de Rentabilidade</div>
        <span class="tag-pill tag-green">Visão Executiva</span>
      </div>
      ${imgDash ? `<img src="${imgDash}" alt="Dashboard CMV Dobro Pizzas" />` : ''}
      <div class="system-mockup-caption">
        <strong>Tela de Gestão Executiva:</strong> Apresenta os 4 indicadores vitais no topo (CMV Médio Geral, Margem Bruta / un, Fichas Ativas e Alertas) e a tabela dinâmica com o <strong>Preço Ideal para 30% de CMV</strong>.
      </div>
    </div>

    <!-- SCREENSHOT 2: FICHAS TÉCNICAS -->
    <div class="system-mockup">
      <div class="system-mockup-header">
        <div class="system-mockup-dots">
          <span class="system-mockup-dot" style="background:#ff5f56;"></span>
          <span class="system-mockup-dot" style="background:#ffbd2e;"></span>
          <span class="system-mockup-dot" style="background:#27c93f;"></span>
        </div>
        <div class="system-mockup-title">Aba 2: Catálogo de Fichas Técnicas Ativas</div>
        <span class="tag-pill tag-green">Receitas & Porções</span>
      </div>
      ${imgFichas ? `<img src="${imgFichas}" alt="Fichas Técnicas Dobro Pizzas" />` : ''}
      <div class="system-mockup-caption">
        <strong>Cards de Receita por Pizza:</strong> Exibe cada pizza cadastrada com preço de venda, custo de insumos, margem em reais, % CMV e a composição detalhada em gramas.
      </div>
    </div>

    <div class="page-footer">
      <div>Dobro Pizzas • Manual de Gestão de CMV</div>
      <div>Página 3</div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PÁGINA 4: TELAS REAIS: INSUMOS & MODAL AO VIVO              -->
  <!-- ============================================================ -->
  <div class="page">
    <div class="doc-header">
      <div class="left">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
        <div>
          <div class="brand-title">Dobro Pizzas</div>
          <div class="brand-sub">Manual de Ficha Técnica</div>
        </div>
      </div>
      <div class="right-badge">Capítulo 2 • Painel em Operação (Cont.)</div>
    </div>

    <h2 class="section-title">Insumos & Montador com Simulador ao Vivo</h2>
    <p class="lead-text">
      Como o sistema calcula custos de compras e simula a margem de lucro em tempo real:
    </p>

    <!-- SCREENSHOT 3: INSUMOS -->
    <div class="system-mockup">
      <div class="system-mockup-header">
        <div class="system-mockup-dots">
          <span class="system-mockup-dot" style="background:#ff5f56;"></span>
          <span class="system-mockup-dot" style="background:#ffbd2e;"></span>
          <span class="system-mockup-dot" style="background:#27c93f;"></span>
        </div>
        <div class="system-mockup-title">Aba 3: Tabela de Insumos & Conversor Automático</div>
        <span class="tag-pill tag-green">Compras & Fornecedores</span>
      </div>
      ${imgInsumos ? `<img src="${imgInsumos}" alt="Tabela de Insumos Dobro Pizzas" />` : ''}
      <div class="system-mockup-caption">
        <strong>Base de Compras:</strong> Você digita o valor pago no fardo/peça (ex: R$ 168,00 por 4kg) e o sistema calcula automaticamente <strong>R$ 0,0420 por grama</strong>. Permite busca rápida e filtro por categorias.
      </div>
    </div>

    <!-- SCREENSHOT 4: MODAL DE MONTAGEM -->
    <div class="system-mockup">
      <div class="system-mockup-header">
        <div class="system-mockup-dots">
          <span class="system-mockup-dot" style="background:#ff5f56;"></span>
          <span class="system-mockup-dot" style="background:#ffbd2e;"></span>
          <span class="system-mockup-dot" style="background:#27c93f;"></span>
        </div>
        <div class="system-mockup-title">Modal de Montagem & Simulador de Margem ao Vivo</div>
        <span class="tag-pill tag-green">Simulador em Tempo Real</span>
      </div>
      ${imgModal ? `<img src="${imgModal}" alt="Modal Ficha Técnica Dobro Pizzas" />` : ''}
      <div class="system-mockup-caption">
        <strong>Montagem com Simulador Instantâneo:</strong> Conforme você seleciona ingredientes e gramaturas na esquerda, a coluna direita recalcula o CMV, a margem de lucro em reais e a sugestão de preço ideal.
      </div>
    </div>

    <div class="page-footer">
      <div>Dobro Pizzas • Manual de Gestão de CMV</div>
      <div>Página 4</div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PÁGINA 5: PASSO A PASSO OPERACIONAL                         -->
  <!-- ============================================================ -->
  <div class="page">
    <div class="doc-header">
      <div class="left">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
        <div>
          <div class="brand-title">Dobro Pizzas</div>
          <div class="brand-sub">Manual de Ficha Técnica</div>
        </div>
      </div>
      <div class="right-badge">Capítulo 3 • Guia Operacional</div>
    </div>

    <h2 class="section-title">3. Passo a Passo: Como Usar no Dia a Dia</h2>
    <p class="lead-text">
      Siga este fluxo simplificado para cadastrar novos sabores ou atualizar custos na cozinha:
    </p>

    <!-- PASSO 1 -->
    <div class="step-box">
      <div class="step-number">1</div>
      <div class="step-content">
        <div class="step-title">Cadastrar ou Conferir os Insumos</div>
        <div class="step-desc">
          Vá na aba <strong>"Insumos & Matérias-Primas"</strong> e clique em <strong>"+ Novo Insumo"</strong>. Preencha o nome, categoria, preço pago na nota fiscal e a quantidade comprada. O sistema calcula o custo por grama instantaneamente.
        </div>
        <div class="step-tip">💡 Exemplo: Fardo com 50 caixas por R$ 145,00 = R$ 2,90 por embalagem.</div>
      </div>
    </div>

    <!-- PASSO 2 -->
    <div class="step-box">
      <div class="step-number">2</div>
      <div class="step-content">
        <div class="step-title">Criar a Ficha Técnica da Pizza</div>
        <div class="step-desc">
          Clique no botão verde superior <strong>"+ Nova Ficha Técnica"</strong>. Selecione qual pizza do cardápio deseja montar e escolha o tamanho correspondente (Grande G, Média M ou Broto P).
        </div>
        <div class="step-tip">💡 Se a pizza tem tamanhos M e G, crie uma ficha para cada tamanho.</div>
      </div>
    </div>

    <!-- PASSO 3 -->
    <div class="step-box">
      <div class="step-number">3</div>
      <div class="step-content">
        <div class="step-title">Adicionar Ingredientes e Gramaturas da Bancada</div>
        <div class="step-desc">
          Clique em <strong>"+ Adicionar Insumo"</strong>. Selecione o ingrediente na lista e digite a quantidade em gramas que o pizzaiolo colocará na balança.
        </div>
        <div class="step-tip">💡 Exemplo Pizza G: Massa G (1 un) + Molho (90g) + Mussarela (220g) + Calabresa (170g) + Cebola (50g) + Azeitonas (30g).</div>
      </div>
    </div>

    <!-- PASSO 4 -->
    <div class="step-box">
      <div class="step-number">4</div>
      <div class="step-content">
        <div class="step-title">Conferir Embalagens e Custo Fixo de Forno</div>
        <div class="step-desc">
          O sistema já vem preenchido com a média ideal: <strong>R$ 2,90</strong> para embalagem (caixa oitavada + lacre de segurança + saco térmico) e <strong>R$ 1,50</strong> para energia, gás e lenha por pizza assada.
        </div>
        <div class="step-tip">💡 Em pizzas broto/individuais (P), ajuste o custo de embalagem correspondente (ex: R$ 1,80).</div>
      </div>
    </div>

    <!-- PASSO 5 -->
    <div class="step-box">
      <div class="step-number">5</div>
      <div class="step-content">
        <div class="step-title">Observar o Simulador e Salvar</div>
        <div class="step-desc">
          Na coluna direita da tela, veja o <strong>Termômetro de CMV</strong>. Se estiver verde (&lt; 30%), a margem está perfeita. Veja também a linha <strong>"Preço Ideal para 30%"</strong>: se você estiver cobrando menos do que ela indica, avalie reajustar o cardápio. Clique em <strong>"Salvar Ficha Técnica"</strong>.
        </div>
      </div>
    </div>

    <div class="card card-highlight" style="margin-top: 8px;">
      <div style="font-size: 8.2pt; font-weight: 800; color: var(--brand-green); margin-bottom: 2px;">
        📝 Campo de "Modo de Montagem / Instruções":
      </div>
      <div style="font-size: 7.6pt; color: var(--stone-600); line-height: 1.4;">
        Aproveite esse campo no editor para anotar detalhes críticos que evitam erros na hora do pico (ex: <em>"Borda recheada deve ser aplicada antes do molho; forno a 350°C; orégano apenas na saída do forno"</em>).
      </div>
    </div>

    <div class="page-footer">
      <div>Dobro Pizzas • Manual de Gestão de CMV</div>
      <div>Página 5</div>
    </div>
  </div>

  <!-- ============================================================ -->
  <!-- PÁGINA 6: ENGENHARIA DE CARDÁPIO & GUIA DE BANCADA         -->
  <!-- ============================================================ -->
  <div class="page">
    <div class="doc-header">
      <div class="left">
        ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
        <div>
          <div class="brand-title">Dobro Pizzas</div>
          <div class="brand-sub">Manual de Ficha Técnica</div>
        </div>
      </div>
      <div class="right-badge">Capítulo 4 • Inteligência de Negócio</div>
    </div>

    <h2 class="section-title">4. Como Ter o Melhor Proveito: Estratégias</h2>
    <p class="lead-text">
      Com a ficha técnica estruturada, a Dobro Pizzas deve operar sob a metodologia de <strong>Engenharia de Cardápio</strong>:
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
      <div class="card" style="border-left: 4px solid #137333;">
        <div style="font-size: 8.2pt; font-weight: 800; color: #137333;">⭐ PIZZAS ESTRELAS</div>
        <div style="font-size: 7.2pt; font-weight: 700; color: var(--stone-600); margin-bottom: 3px;">Alta Venda + Alta Margem (CMV &lt; 28%)</div>
        <p style="font-size: 7.4pt; color: var(--stone-600); line-height: 1.4;">
          São os pilares de lucro da casa (ex: Calabresa Tradicional, Marguerita Especial). Coloque-as em destaque visual no cardápio online e no topo do WhatsApp.
        </p>
      </div>

      <div class="card" style="border-left: 4px solid #b06000;">
        <div style="font-size: 8.2pt; font-weight: 800; color: #b06000;">🐎 CAVALOS DE BATALHA</div>
        <div style="font-size: 7.2pt; font-weight: 700; color: var(--stone-600); margin-bottom: 3px;">Alta Venda + Margem Média (CMV 30% a 35%)</div>
        <p style="font-size: 7.4pt; color: var(--stone-600); line-height: 1.4;">
          Pizzas muito pedidas com queijo pesado (ex: Frango c/ Catupiry, Quatro Queijos). Monitore a pesagem com rigor para não deixar o queijo ultrapassar a cota.
        </p>
      </div>
    </div>

    <h2 class="section-title" style="margin-top: 10px;">Tabela de Referência Rápida para Bancada (Pizzas G)</h2>
    <p style="font-size: 7.8pt; color: var(--stone-600); margin-bottom: 4px;">
      Gramaturas médias recomendadas para pizzas grandes (8 fatias / 35cm) com padrão visual e peso calibrado:
    </p>

    <table class="custom-table">
      <thead>
        <tr>
          <th>Componente da Pizza</th>
          <th>Gramatura Padrão (G)</th>
          <th>Custo Médio Est.</th>
          <th>Regra de Ouro do Pizzaiolo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Disco de Massa G</strong></td>
          <td class="font-mono">350g (1 bola)</td>
          <td class="font-mono">R$ 3,20</td>
          <td>Fermentação mínima 24h a 48h; abrir mantendo borda aerada.</td>
        </tr>
        <tr>
          <td><strong>Molho Pelado Especial</strong></td>
          <td class="font-mono">80g a 90g</td>
          <td class="font-mono">R$ 1,35</td>
          <td>Espalhar em espiral deixando 1,5cm de borda limpa.</td>
        </tr>
        <tr>
          <td><strong>Queijo Mussarela Base</strong></td>
          <td class="font-mono">200g a 220g</td>
          <td class="font-mono">R$ 8,80</td>
          <td>Pesar sempre na cumbuca ou balança de bancada. Nunca no olho.</td>
        </tr>
        <tr>
          <td><strong>Recheio Principal (Calabresa/Frango)</strong></td>
          <td class="font-mono">160g a 200g</td>
          <td class="font-mono">R$ 4,50</td>
          <td>Distribuir uniformemente para cobrir todo o disco.</td>
        </tr>
        <tr>
          <td><strong>Embalagem Completa</strong></td>
          <td class="font-mono">1 kit</td>
          <td class="font-mono">R$ 2,90</td>
          <td>Caixa oitavada + lacre de segurança + saco térmico vedado.</td>
        </tr>
        <tr>
          <td><strong>Custo Forno / Operação</strong></td>
          <td class="font-mono">Rateio unitário</td>
          <td class="font-mono">R$ 1,50</td>
          <td>Gás, lenha e energia elétrica por assamento.</td>
        </tr>
        <tr style="background: #f4eee3;">
          <td><strong style="color: var(--brand-green);">CUSTO TOTAL MÉDIO (CMV)</strong></td>
          <td class="font-mono"><strong>~850g pronta</strong></td>
          <td class="font-mono"><strong style="color: var(--brand-green);">R$ 22,25</strong></td>
          <td><strong>Preço Sugerido (30% CMV): R$ 69,90 a R$ 74,90</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- CHECKLIST SEMANAL -->
    <div class="card card-highlight" style="margin-top: 8px;">
      <div style="font-size: 8.2pt; font-weight: 800; color: var(--brand-green); margin-bottom: 3px;">
        📋 Rotina Semanal de 5 Minutos da Dobro Pizzas:
      </div>
      <div style="font-size: 7.6pt; color: var(--stone-600); line-height: 1.4;">
        <strong>1. Toda Segunda-feira:</strong> Olhe a nota fiscal dos queijos e carnes. Se mudou o preço, altere na Aba Insumos.<br>
        <strong>2. No Dashboard:</strong> Verifique se alguma pizza acendeu o semáforo vermelho (🔴).<br>
        <strong>3. Na Sexta-feira:</strong> Faça uma pesagem surpresa de 3 pizzas na bancada para calibrar a mão da equipe.
      </div>
    </div>

    <div class="page-footer">
      <div>Dobro Pizzas • Manual de Gestão de CMV</div>
      <div>Página 6 • Fim do Documento</div>
    </div>
  </div>

</body>
</html>
`;

(async () => {
  console.log('Iniciando Puppeteer para gerar PDF oficial Dobro Pizzas com screenshots reais...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const targetDir = path.resolve('..');
  const targetPdf = path.join(targetDir, 'Manual_Ficha_Tecnica_Dobro_Pizza.pdf');
  const artifactPdf = 'C:/Users/herek/.gemini/antigravity-ide/brain/472aca46-a613-4652-b450-58713165c8c0/Manual_Ficha_Tecnica_Dobro_Pizza.pdf';

  console.log('Renderizando PDF em A4 com screenshots reais do sistema...');
  await page.pdf({
    path: targetPdf,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '12mm',
      right: '12mm'
    }
  });

  // Copia para o diretório de artefatos
  fs.copyFileSync(targetPdf, artifactPdf);
  console.log('PDF gerado com sucesso em:', targetPdf);
  console.log('Cópia salva no artifact dir:', artifactPdf);

  await browser.close();
})();
