# Normattiva MCP Extension

A Claude Desktop Extension that connects Claude to Italian law and fiscal practice:

- **[Normattiva](https://www.normattiva.it)** — Italy's official consolidated legislation database
- **[Agenzia delle Entrate](https://www.agenziaentrate.gov.it)** and **[def.finanze.it](https://def.finanze.it)** — interpelli, circolari, risoluzioni and other fiscal guidance documents

Once installed, you can ask Claude things like:

- *"Trova il decreto legislativo 81/2008 sulla sicurezza sul lavoro"*
- *"Cosa dice l'articolo 18 dello Statuto dei Lavoratori?"*
- *"Quali leggi sono state aggiornate tra gennaio e marzo 2024?"*
- *"Trovami l'interpello n. 82 del 2026"*
- *"Cosa dice l'AdE sulle cripto-attività?"*
- *"Ci sono circolari dell'INPS sulla contribuzione sportiva?"*

---

## Installation

### Option A — One-click (recommended)

1. Download `normattiva.mcpb` from the [latest release](https://github.com/RAAS-Impact/normattiva-claude-mcb/releases/latest)
2. Double-click the file (or drag it into Claude Desktop → Settings → Extensions)
3. Done — no terminal, no configuration needed

> **Requires** [Claude Desktop](https://claude.ai/download) 1.0 or later. Node.js is bundled with Claude Desktop; no separate installation needed.

### Option B — From source

```bash
git clone https://github.com/RAAS-Impact/normattiva-claude-mcb.git
cd normattiva-claude-mcb
npm install -g @anthropic-ai/mcpb
mcpb pack
```

Then double-click the generated `normattiva.mcpb` file.

---

## Adding the skill

The `skill/` directory contains Claude skill files that teach Claude how to use the extension correctly.

Copy the contents of **all three files** into your Claude Project instructions, in this order:

1. [`skill/SKILL.md`](skill/SKILL.md) — routing: decides whether to use Normattiva tools or web navigation
2. [`skill/normattiva.md`](skill/normattiva.md) — how to search and retrieve legislation via the MCP tools
3. [`skill/interpelli.md`](skill/interpelli.md) — how to navigate agenziaentrate.gov.it and def.finanze.it for fiscal guidance documents

---

## How it works

The extension implements the full [Normattiva OpenData REST API](https://dati.normattiva.it/assets/come_fare_per/openapi-bff-opendata.json) as MCP tools. Fiscal practice documents (interpelli, circolari) are retrieved via browser navigation using Claude's built-in web tools — no additional MCP server required for that part.

```
normattiva-claude-mcb/
├── manifest.json        # Extension manifest (mcpb)
├── server/
│   └── index.js         # MCP server — pure Node.js, no dependencies
├── skill/
│   ├── SKILL.md         # Routing: legislation vs. fiscal practice
│   ├── normattiva.md    # Instructions for Normattiva MCP tools
│   └── interpelli.md    # Instructions for navigating AE and def.finanze.it
├── test/
│   ├── normattiva.js    # Integration tests (Normattiva API)
│   └── INTERPELLI.md    # Manual test suite (interpelli navigation)
└── README.md
```

### Available tools

| Tool | Description |
|---|---|
| `ricercaSemplice` | Free-text search |
| `ricercaAvanzata` | Filtered search by type, date, number |
| `ricercaAttiAggiornati` | Acts modified in a date range |
| `ricercaPredefinita` | Preset search configurations |
| `getDettaglioAtto` | Full act text by `codiceRedazionale` |
| `getDettaglioAttoByUrn` | Full act text by NIR URN |
| `tipologicaDenominazione` | Valid act denomination types |
| `tipologicaClasse` | Valid measure class codes |
| `getEstensioni` | Supported export formats |
| `nuovaRicercaAsincrona` | Start async bulk export (step 1/4) |
| `confermaRicercaAsincrona` | Confirm async job (step 2/4) |
| `checkStatus` | Poll async job status (step 3/4) |
| `scaricaCollezioneAsincrona` | Download async result (step 4/4) |
| `ottieniCollezioniPredefinite` | List curated dataset snapshots |
| `scaricaCollezionePreconfezionata` | Download a named predefined collection |
| `getEliUri` | Build a permanent ELI URI for any act |

---

## Data source

All legislation data is provided by [Normattiva](https://www.normattiva.it), the official Italian legislation portal managed by the Istituto Poligrafico e Zecca dello Stato. Data is public and available under [IODL 2.0](https://www.dati.gov.it/iodl/2.0/).
