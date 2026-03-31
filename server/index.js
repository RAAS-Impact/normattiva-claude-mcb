#!/usr/bin/env node
'use strict';

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

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'ricercaSemplice',
    description: 'Ricerca libera nel testo della normativa italiana. Usare per query in linguaggio naturale come "legge sulla privacy" o "decreto sicurezza sul lavoro". Restituisce una lista paginata di atti con codiceRedazionale.',
    inputSchema: {
      type: 'object',
      properties: {
        testoRicerca: { type: 'string', description: 'Testo da cercare' },
        orderType: { type: 'string', description: 'Tipo di ordinamento' },
        paginazione: {
          type: 'object',
          properties: {
            paginaCorrente: { type: 'integer', description: 'Numero di pagina (base 1)' },
            numeroElementiPerPagina: { type: 'integer', description: 'Risultati per pagina' }
          }
        },
        limitaAnniVigenza: { type: 'boolean', description: 'Limita agli atti attualmente in vigore' }
      }
    }
  },
  {
    name: 'ricercaAvanzata',
    description: 'Ricerca filtrata con criteri strutturati. Usare quando l\'utente specifica tipo di atto, intervallo di date, numero dell\'atto o ente emanante. Preferire questa ricerca anche quando l\'utente cita un atto per numero (es. "Legge 300/1970"): usare numeroProvvedimento + annoProvvedimento è più preciso della ricerca libera. Prima di chiamarla, recuperare i valori validi dai tool tipologici.',
    inputSchema: {
      type: 'object',
      properties: {
        denominazioneAtto: { type: 'string', description: 'Denominazione dell\'atto (es. "LEGGE", "DECRETO LEGISLATIVO"). ATTENZIONE: passare il campo \"value\" restituito da tipologicaDenominazione (es. "DECRETO LEGISLATIVO"), NON il codice \"label\" (es. "PLL").' },
        titoloRicerca: { type: 'string', description: 'Ricerca nel titolo' },
        testoRicerca: { type: 'string', description: 'Ricerca nel testo completo' },
        numeroProvvedimento: { type: 'integer', description: 'Numero dell\'atto' },
        giornoProvvedimento: { type: 'integer', description: 'Giorno dell\'atto' },
        meseProvvedimento: { type: 'integer', description: 'Mese dell\'atto' },
        annoProvvedimento: { type: 'integer', description: 'Anno dell\'atto' },
        dataInizioEmanazione: { type: 'string', description: 'Data inizio emanazione (YYYY-MM-DD)' },
        dataFineEmanazione: { type: 'string', description: 'Data fine emanazione (YYYY-MM-DD)' },
        dataInizioPubProvvedimento: { type: 'string', description: 'Data inizio pubblicazione in GU (YYYY-MM-DD)' },
        dataFinePubProvvedimento: { type: 'string', description: 'Data fine pubblicazione in GU (YYYY-MM-DD)' },
        vigenza: { type: 'string', description: 'Data di vigenza (YYYY-MM-DD); omettere per la versione attuale' },
        classeProvvedimento: { type: 'string', description: 'Codice classe provvedimento — valori validi da tipologicaClasse' },
        orderType: { type: 'string', description: 'Tipo di ordinamento' },
        paginazione: {
          type: 'object',
          properties: {
            paginaCorrente: { type: 'integer' },
            numeroElementiPerPagina: { type: 'integer' }
          }
        },
        limitaAnniVigenza: { type: 'boolean' }
      }
    }
  },
  {
    name: 'ricercaAttiAggiornati',
    description: 'Trova gli atti modificati in un intervallo di date. Usare quando l\'utente chiede "quali leggi sono cambiate tra la data A e la data B".',
    inputSchema: {
      type: 'object',
      required: ['dataInizioAggiornamento', 'dataFineAggiornamento'],
      properties: {
        dataInizioAggiornamento: { type: 'string', description: 'Data inizio (ISO 8601, es. 2024-01-01T00:00:00)' },
        dataFineAggiornamento: { type: 'string', description: 'Data fine (ISO 8601, es. 2024-03-31T23:59:59)' }
      }
    }
  },
  {
    name: 'ricercaPredefinita',
    description: 'Restituisce configurazioni di ricerca predefinite dalla piattaforma. Utile quando l\'utente non ha una query specifica e vuole sfogliare le categorie.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'getDettaglioAtto',
    description: 'Recupera il testo completo e i metadati di un atto tramite codiceRedazionale. Richiede anche dataGU (data di pubblicazione in GU, formato YYYY-MM-DD), restituita insieme a codiceRedazionale dai tool di ricerca. Per il recupero a livello di articolo: chiamare prima SENZA idArticolo per ottenere la lista delle sezioni disponibili, poi richiamare CON idArticolo per l\'articolo desiderato.',
    inputSchema: {
      type: 'object',
      required: ['codiceRedazionale', 'dataGU'],
      properties: {
        codiceRedazionale: { type: 'string', description: 'Codice dell\'atto dai risultati di ricerca (es. "008G0104")' },
        dataGU: { type: 'string', description: 'Data di pubblicazione in Gazzetta Ufficiale (YYYY-MM-DD), restituita dal campo dataGU nei risultati di ricerca' },
        idArticolo: { type: 'integer', description: 'ID articolo per recupero a livello di articolo' },
        sottoArticolo: { type: 'integer', description: 'Numero sotto-articolo' },
        sottoArticolo1: { type: 'integer', description: 'Ulteriore sotto-articolo' },
        flagTipoArticolo: { type: 'string', description: 'Flag tipo articolo' },
        idGruppo: { type: 'integer', description: 'ID gruppo' },
        progressivo: { type: 'integer', description: 'Progressivo' },
        versione: { type: 'integer', description: 'Numero versione' },
        dataVigenza: { type: 'string', description: 'Data per versione storica (YYYY-MM-DD); omettere per la versione attuale' },
        tipoDettaglio: { type: 'string', description: 'Tipo di dettaglio richiesto' }
      }
    }
  },
  {
    name: 'getDettaglioAttoByUrn',
    description: 'Recupera un atto tramite URN NIR (es. "urn:nir:stato:legge:1970-05-20;300"). Usare quando l\'utente fornisce direttamente un riferimento URN.',
    inputSchema: {
      type: 'object',
      required: ['urn'],
      properties: {
        urn: { type: 'string', description: 'Stringa URN NIR (es. "urn:nir:stato:legge:1970-05-20;300")' }
      }
    }
  },
  {
    name: 'tipologicaDenominazione',
    description: 'Restituisce i tipi di denominazione degli atti validi (es. "LEGGE", "DECRETO LEGISLATIVO"). Chiamare prima di ricercaAvanzata per ottenere valori validi per il campo denominazioneAtto.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'tipologicaClasse',
    description: 'Restituisce i codici classe provvedimento validi per il filtro classeProvvedimento in ricercaAvanzata.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'getEstensioni',
    description: 'Restituisce i formati di file supportati per le operazioni di download asincrono.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'nuovaRicercaAsincrona',
    description: 'Passo 1 di 4 del flusso di esportazione bulk. Invia una ricerca per l\'elaborazione asincrona. Restituisce un token. Seguire con confermaRicercaAsincrona.',
    inputSchema: {
      type: 'object',
      required: ['formato', 'parametriRicerca', 'tipoRicerca'],
      properties: {
        formato: { type: 'string', description: 'Formato di esportazione (da getEstensioni)' },
        tipoRicerca: { type: 'string', description: '"S" per semplice, "A" per avanzata' },
        richiestaExport: { type: 'string', enum: ['O', 'V', 'M'], description: 'Tipo di esportazione' },
        modalita: { type: 'string', enum: ['C', 'R'], description: 'Modalità' },
        email: { type: 'string', description: 'Email opzionale per notifica' },
        parametriRicerca: { type: 'object', description: 'Parametri di ricerca (stessi campi di ricercaAvanzata)' }
      }
    }
  },
  {
    name: 'confermaRicercaAsincrona',
    description: 'Passo 2 di 4 del flusso di esportazione bulk. Conferma la richiesta asincrona e mette in coda il job. Passare il token restituito da nuovaRicercaAsincrona.',
    inputSchema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'Token da nuovaRicercaAsincrona' }
      }
    }
  },
  {
    name: 'checkStatus',
    description: 'Passo 3 di 4 del flusso di esportazione bulk. Controlla lo stato di un job asincrono. Verificare descrizioneStato per il progresso e stato per il completamento. Fare polling ogni qualche secondo fino al completamento.',
    inputSchema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'Token da nuovaRicercaAsincrona' }
      }
    }
  },
  {
    name: 'scaricaCollezioneAsincrona',
    description: 'Passo 4 di 4 del flusso di esportazione bulk. Scarica l\'archivio ZIP una volta che checkStatus indica il completamento.',
    inputSchema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', description: 'Token da nuovaRicercaAsincrona' }
      }
    }
  },
  {
    name: 'ottieniCollezioniPredefinite',
    description: 'Elenca le snapshot di dataset curati disponibili su Normattiva (nomeCollezione, formato, numero atti, data creazione).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'scaricaCollezionePreconfezionata',
    description: 'Scarica una collezione predefinita nominata come ZIP. Ottenere prima i nomi disponibili da ottieniCollezioniPredefinite.',
    inputSchema: {
      type: 'object',
      required: ['nome', 'formato'],
      properties: {
        nome: { type: 'string', description: 'Nome della collezione (da ottieniCollezioniPredefinite)' },
        formato: { type: 'string', description: 'Formato file (da getEstensioni)' },
        formatoRichiesta: { type: 'string', description: 'Formato richiesta' }
      }
    }
  },
  {
    name: 'getEliUri',
    description: 'Costruisce l\'URI ELI (European Legislation Identifier) permanente di un atto. Schema IPZS: eli/id/{yyyy}/{mm}/{dd}/{codiceRedazionale}/{tipoVersione}/{dataVersione}/{lingua}/{formato}. Passare dataGU (es. "2008-04-09") oppure anno+mese+giorno separati — entrambe le forme sono accettate. CONSOLIDATED = testo vigente; CONSOLIDATED + dataVersione = testo vigente a una data specifica (formato "yyyymmdd", es. "20150101"); ORIGINAL = testo originale alla pubblicazione.',
    inputSchema: {
      type: 'object',
      required: ['codiceRedazionale'],
      properties: {
        codiceRedazionale: { type: 'string', description: 'Codice redazionale dell\'atto (es. "008G0073"), restituito da tutti i tool di ricerca e dettaglio' },
        dataGU: { type: 'string', description: 'Data di pubblicazione in GU nel formato "YYYY-MM-DD" (es. "2008-04-09"), restituita dal campo dataGU nei risultati di ricerca. Alternativa a anno+mese+giorno.' },
        anno: { type: 'integer', description: 'Anno di pubblicazione in GU — usare in alternativa a dataGU' },
        mese: { type: 'integer', description: 'Mese di pubblicazione in GU — usare in alternativa a dataGU' },
        giorno: { type: 'integer', description: 'Giorno di pubblicazione in GU — usare in alternativa a dataGU' },
        versione: { type: 'string', enum: ['CONSOLIDATED', 'ORIGINAL'], description: 'CONSOLIDATED (default) o ORIGINAL' },
        dataVersione: { type: 'string', description: 'Data vigenza per versione storica, formato "yyyymmdd" (es. "20150101"). Solo con CONSOLIDATED. Corrisponde al campo dataVigenza restituito da getDettaglioAtto.' },
        lingua: { type: 'string', description: 'Lingua — solo "ita"' },
        formato: { type: 'string', description: 'Formato — solo "html"' }
      }
    }
  },
];

// ─── HTTP Helper ──────────────────────────────────────────────────────────────

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
    req.on('timeout', () => req.destroy(new Error('Richiesta scaduta (timeout)')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Search Helpers ───────────────────────────────────────────────────────────

// The Normattiva API returns 500 (not 400) when paginazione is omitted.
// Always inject a safe default so callers never hit that crash.
function withDefaultPaginazione(args) {
  if (args.paginazione) return args;
  return { ...args, paginazione: { paginaCorrente: 1, numeroElementiPerPagina: 10 } };
}

// ─── ELI Helpers ──────────────────────────────────────────────────────────────

// Accepts either dataGU:"YYYY-MM-DD" or separate anno/mese/giorno fields.
// Returns [yyyy, mm, dd] as zero-padded strings.
function resolveDate({ dataGU, anno, mese, giorno }) {
  if (dataGU) {
    const [y, m, d] = dataGU.split('-');
    return [y, m.padStart(2, '0'), d.padStart(2, '0')];
  }
  return [String(anno), String(mese).padStart(2, '0'), String(giorno).padStart(2, '0')];
}


// ─── Tool Dispatch ────────────────────────────────────────────────────────────

async function callTool(name, args = {}) {
  let resp;

  switch (name) {
    case 'ricercaSemplice':
      resp = await apiRequest('POST', '/api/v1/ricerca/semplice', withDefaultPaginazione(args));
      break;
    case 'ricercaAvanzata':
      resp = await apiRequest('POST', '/api/v1/ricerca/avanzata', withDefaultPaginazione(args));
      break;
    case 'ricercaAttiAggiornati':
      resp = await apiRequest('POST', '/api/v1/ricerca/aggiornati', args);
      break;
    case 'ricercaPredefinita':
      resp = await apiRequest('GET', '/api/v1/ricerca/predefinita');
      break;
    case 'getDettaglioAtto':
      resp = await apiRequest('POST', '/api/v1/atto/dettaglio-atto', args);
      break;
    case 'getDettaglioAttoByUrn':
      resp = await apiRequest('POST', '/api/v1/atto/dettaglio-atto-urn', args);
      break;
    case 'tipologicaDenominazione':
      resp = await apiRequest('GET', '/api/v1/tipologiche/denominazione-atto');
      break;
    case 'tipologicaClasse':
      resp = await apiRequest('GET', '/api/v1/tipologiche/classe-provvedimento');
      break;
    case 'getEstensioni':
      resp = await apiRequest('GET', '/api/v1/tipologiche/estensioni');
      break;
    case 'nuovaRicercaAsincrona':
      resp = await apiRequest('POST', '/api/v1/ricerca-asincrona/nuova-ricerca', args);
      break;
    case 'confermaRicercaAsincrona':
      resp = await apiRequest('PUT', '/api/v1/ricerca-asincrona/conferma-ricerca', { token: args.token });
      break;
    case 'checkStatus': {
      const token = encodeURIComponent(args.token);
      resp = await apiRequest('GET', `/api/v1/ricerca-asincrona/check-status/${token}`);
      break;
    }
    case 'scaricaCollezioneAsincrona': {
      const token = encodeURIComponent(args.token);
      resp = await apiRequest('GET', `/api/v1/collections/download/collection-asincrona/${token}`);
      break;
    }
    case 'ottieniCollezioniPredefinite':
      resp = await apiRequest('GET', '/api/v1/collections/collection-predefinite');
      break;
    case 'scaricaCollezionePreconfezionata': {
      const params = new URLSearchParams();
      if (args.nome) params.set('nome', args.nome);
      if (args.formato) params.set('formato', args.formato);
      if (args.formatoRichiesta) params.set('formatoRichiesta', args.formatoRichiesta);
      resp = await apiRequest('GET', `/api/v1/collections/download/collection-preconfezionata?${params}`);
      break;
    }
    case 'getEliUri': {
      const { codiceRedazionale, versione = 'CONSOLIDATED', dataVersione, lingua = 'ita', formato = 'html' } = args;
      const [yyyy, mm, dd] = resolveDate(args);
      const segments = [versione];
      if (versione === 'CONSOLIDATED' && dataVersione) segments.push(dataVersione);
      segments.push(lingua, formato);
      const uri = `https://www.normattiva.it/eli/id/${yyyy}/${mm}/${dd}/${codiceRedazionale}/${segments.join('/')}`;
      return { content: [{ type: 'text', text: JSON.stringify({ uri, versione, ...(dataVersione ? { dataVersione } : {}) }, null, 2) }] };
    }
    default:
      return { content: [{ type: 'text', text: `Tool sconosciuto: ${name}` }], isError: true };
  }

  const text = typeof resp.body === 'string'
    ? resp.body
    : JSON.stringify(resp.body, null, 2);

  return {
    content: [{ type: 'text', text }],
    isError: resp.status >= 400
  };
}

// ─── MCP stdio transport (newline-delimited JSON-RPC 2.0) ─────────────────────

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', chunk => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      try { dispatch(JSON.parse(trimmed)); } catch { /* ignore malformed JSON */ }
    }
  }
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function dispatch(msg) {
  const { id, method, params } = msg;

  // Notifications have no id — no response needed
  if (id === undefined) return;

  try {
    switch (method) {
      case 'initialize':
        send({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'Normattiva', version: '1.0.0' }
          }
        });
        break;

      case 'tools/list':
        send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        break;

      case 'tools/call': {
        const result = await callTool(params.name, params.arguments || {});
        send({ jsonrpc: '2.0', id, result });
        break;
      }

      case 'resources/list':
        send({ jsonrpc: '2.0', id, result: { resources: [] } });
        break;

      case 'prompts/list':
        send({ jsonrpc: '2.0', id, result: { prompts: [] } });
        break;

      default:
        send({
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Metodo non trovato: ${method}` }
        });
    }
  } catch (err) {
    send({
      jsonrpc: '2.0', id,
      error: { code: -32603, message: err.message }
    });
  }
}

process.stdin.on('end', () => process.exit(0));
