#!/usr/bin/env node
'use strict';

// Repeatable integration tests against the live Normattiva API.
// Usage: node test.js

const https = require('https');

const BASE_HOST = 'api.normattiva.it';
const BASE_PATH = '/t/normattiva.api/bff-opendata/v1';

const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Connection': 'keep-alive',
  'Origin': 'https://dati.normattiva.it',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
};

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE_HOST,
      path: BASE_PATH + path,
      method,
      headers: {
        ...BROWSER_HEADERS,
        ...(bodyStr ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        } : {})
      },
      timeout: 30000
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}


// ─── Runner ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

async function test(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log('\x1b[32mOK\x1b[0m');
    passed++;
  } catch (e) {
    console.log(`\x1b[31mFAIL\x1b[0m — ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(resp, expected = 200) {
  assert(resp.status === expected,
    `HTTP ${resp.status} (expected ${expected}): ${JSON.stringify(resp.body).slice(0, 300)}`);
}

// Response shapes vary by endpoint:
//   - Typological GETs    → plain array
//   - Search POSTs        → { listaAtti: [...], ... }
//   - getDettaglioAtto*   → { success, data: { atto, ... }, message }
//   - collections GETs    → { success, data, ... } or plain array

// ─── Tests ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\nNormattiva API integration tests\n');

  // ── Typological helpers — return plain array ──────────────────────────────

  await test('tipologicaDenominazione — returns array of {label, value}', async () => {
    const r = await apiRequest('GET', '/api/v1/tipologiche/denominazione-atto');
    assertStatus(r);
    assert(Array.isArray(r.body), `expected array, got: ${typeof r.body}`);
    assert(r.body.length > 0, 'empty array');
    assert(r.body[0].label && r.body[0].value, 'items missing label/value');
  });

  await test('tipologicaClasse — returns array', async () => {
    const r = await apiRequest('GET', '/api/v1/tipologiche/classe-provvedimento');
    assertStatus(r);
    assert(Array.isArray(r.body), `expected array, got: ${typeof r.body}`);
    assert(r.body.length > 0, 'empty array');
  });

  await test('getEstensioni — returns array', async () => {
    const r = await apiRequest('GET', '/api/v1/tipologiche/estensioni');
    assertStatus(r);
    assert(Array.isArray(r.body), `expected array, got: ${typeof r.body}`);
    assert(r.body.length > 0, 'empty array');
  });

  await test('ricercaPredefinita — returns 200', async () => {
    const r = await apiRequest('GET', '/api/v1/ricerca/predefinita');
    assertStatus(r);
  });

  await test('ottieniCollezioniPredefinite — returns 200', async () => {
    const r = await apiRequest('GET', '/api/v1/collections/collection-predefinite');
    assertStatus(r);
  });

  // ── Search endpoints — return { listaAtti: [...] } ────────────────────────

  await test('ricercaSemplice — free-text returns listaAtti', async () => {
    const r = await apiRequest('POST', '/api/v1/ricerca/semplice', {
      testoRicerca: 'sicurezza lavoro',
      orderType: 'recente',
      paginazione: { paginaCorrente: 1, numeroElementiPerPagina: 5 }
    });
    assertStatus(r);
    assert(Array.isArray(r.body?.listaAtti), `listaAtti not array: ${JSON.stringify(r.body).slice(0,200)}`);
    assert(r.body.listaAtti.length > 0, 'no results');
    assert(r.body.listaAtti[0].codiceRedazionale, 'codiceRedazionale missing from result');
  });

  await test('ricercaAvanzata — D.Lgs. 81/2008 by number+year', async () => {
    const r = await apiRequest('POST', '/api/v1/ricerca/avanzata', {
      numeroProvvedimento: 81,
      annoProvvedimento: 2008,
      paginazione: { paginaCorrente: 1, numeroElementiPerPagina: 5 }
    });
    assertStatus(r);
    const atti = r.body?.listaAtti;
    assert(Array.isArray(atti) && atti.length > 0, `no results: ${JSON.stringify(r.body).slice(0,200)}`);
    // annoProvvedimento comes back as string from this endpoint
    const found = atti.find(a => String(a.numeroProvvedimento) === '81' && String(a.annoProvvedimento) === '2008');
    assert(found, 'D.Lgs. 81/2008 not in results');
    assert(found.codiceRedazionale, 'codiceRedazionale missing');
  });

  await test('ricercaAvanzata — Legge 300/1970 (Statuto Lavoratori)', async () => {
    const r = await apiRequest('POST', '/api/v1/ricerca/avanzata', {
      numeroProvvedimento: 300,
      annoProvvedimento: 1970,
      paginazione: { paginaCorrente: 1, numeroElementiPerPagina: 5 }
    });
    assertStatus(r);
    const atti = r.body?.listaAtti;
    assert(Array.isArray(atti) && atti.length > 0, 'no results');
    const found = atti.find(a => String(a.numeroProvvedimento) === '300' && String(a.annoProvvedimento) === '1970');
    assert(found, 'Legge 300/1970 not in results');
  });

  await test('ricercaAttiAggiornati — Jan 2024 returns listaAtti', async () => {
    const r = await apiRequest('POST', '/api/v1/ricerca/aggiornati', {
      dataInizioAggiornamento: '2024-01-01T00:00:00.000Z',
      dataFineAggiornamento: '2024-01-31T23:59:59.999Z'
    });
    assertStatus(r);
    assert(Array.isArray(r.body?.listaAtti), `listaAtti not array: ${JSON.stringify(r.body).slice(0,200)}`);
    assert(r.body.listaAtti.length > 0, 'no results');
  });

  // ── Act detail ────────────────────────────────────────────────────────────

  await test('getDettaglioAttoByUrn — D.Lgs. 81/2008', async () => {
    const r = await apiRequest('POST', '/api/v1/atto/dettaglio-atto-urn', {
      urn: 'urn:nir:stato:decreto.legislativo:2008-04-09;81'
    });
    assertStatus(r);
    assert(r.body?.success === true, 'success !== true');
    assert(r.body?.data?.atto?.numeroProvvedimento === 81, 'wrong act');
    assert(r.body?.data?.atto?.articoloHtml, 'articoloHtml missing');
  });

  await test('getDettaglioAtto — D.Lgs. 81/2008 by codiceRedazionale (2-step)', async () => {
    // Step 1: get codiceRedazionale
    const search = await apiRequest('POST', '/api/v1/ricerca/avanzata', {
      numeroProvvedimento: 81,
      annoProvvedimento: 2008,
      paginazione: { paginaCorrente: 1, numeroElementiPerPagina: 5 }
    });
    const atto = search.body?.listaAtti?.find(
      a => String(a.numeroProvvedimento) === '81' && String(a.annoProvvedimento) === '2008'
    );
    assert(atto?.codiceRedazionale, 'step 1: could not get codiceRedazionale');

    // Step 2: fetch full detail (dataGU is required alongside codiceRedazionale)
    const detail = await apiRequest('POST', '/api/v1/atto/dettaglio-atto', {
      codiceRedazionale: atto.codiceRedazionale,
      dataGU: atto.dataGU
    });
    assertStatus(detail);
    assert(detail.body?.data?.atto?.articoloHtml, 'articoloHtml missing in detail');
  });

  // ── ELI tools ─────────────────────────────────────────────────────────────

  function resolveDate({ dataGU, anno, mese, giorno }) {
    if (dataGU) {
      const [y, m, d] = dataGU.split('-');
      return [y, m.padStart(2, '0'), d.padStart(2, '0')];
    }
    return [String(anno), String(mese).padStart(2, '0'), String(giorno).padStart(2, '0')];
  }
  function buildEliUri({ codiceRedazionale, versione = 'CONSOLIDATED', dataVersione, lingua = 'ita', formato = 'html', ...date }) {
    const [yyyy, mm, dd] = resolveDate(date);
    const segments = [versione];
    if (versione === 'CONSOLIDATED' && dataVersione) segments.push(dataVersione);
    segments.push(lingua, formato);
    return `https://www.normattiva.it/eli/id/${yyyy}/${mm}/${dd}/${codiceRedazionale}/${segments.join('/')}`;
  }

  await test('getEliUri — CONSOLIDATED via anno+mese+giorno includes /ita/html by default', () => {
    const uri = buildEliUri({ anno: 2008, mese: 4, giorno: 9, codiceRedazionale: '008G0073' });
    assert(uri === 'https://www.normattiva.it/eli/id/2008/04/09/008G0073/CONSOLIDATED/ita/html', `wrong URI: ${uri}`);
  });

  await test('getEliUri — CONSOLIDATED via dataGU (API field) includes /ita/html by default', () => {
    const uri = buildEliUri({ dataGU: '2008-04-09', codiceRedazionale: '008G0073' });
    assert(uri === 'https://www.normattiva.it/eli/id/2008/04/09/008G0073/CONSOLIDATED/ita/html', `wrong URI: ${uri}`);
  });

  await test('getEliUri — CONSOLIDATED + dataVersione matches PDF example 6', () => {
    const uri = buildEliUri({ dataGU: '2005-01-28', codiceRedazionale: '005G0020', dataVersione: '20100101' });
    assert(uri === 'https://www.normattiva.it/eli/id/2005/01/28/005G0020/CONSOLIDATED/20100101/ita/html', `wrong URI: ${uri}`);
  });

  await test('getEliUri — ORIGINAL matches PDF example 7', () => {
    const uri = buildEliUri({ dataGU: '2005-01-28', codiceRedazionale: '005G0020', versione: 'ORIGINAL' });
    assert(uri === 'https://www.normattiva.it/eli/id/2005/01/28/005G0020/ORIGINAL/ita/html', `wrong URI: ${uri}`);
  });

  await test('getEliUri — ORIGINAL ignores dataVersione', () => {
    const uri = buildEliUri({ dataGU: '2008-04-09', codiceRedazionale: '008G0073', versione: 'ORIGINAL', dataVersione: '20150101' });
    assert(uri === 'https://www.normattiva.it/eli/id/2008/04/09/008G0073/ORIGINAL/ita/html', `wrong URI: ${uri}`);
    assert(!uri.includes('20150101'), 'dataVersione must not appear in ORIGINAL URI');
  });


  // ─── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  const failStr = failed > 0 ? `\x1b[31m${failed} failed\x1b[0m` : `${failed} failed`;
  console.log(`\n${total} tests: \x1b[32m${passed} passed\x1b[0m, ${failStr}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
