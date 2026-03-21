# Changelog

## [1.0.0] - 2026-03-21

### Initial Release

First public release of the Normattiva MCP Extension for Claude Desktop — a Model Context Protocol extension that connects Claude to Italy's official consolidated legislation database ([normattiva.it](https://www.normattiva.it)).

### Features

#### Search
- **`ricercaSemplice`** — Free-text search across Italian legislation
- **`ricercaAvanzata`** — Filtered search by act type, number, date range, and issuing body
- **`ricercaAttiAggiornati`** — Find acts modified within a given date range
- **`ricercaPredefinita`** — Browse preset search configurations

#### Act Retrieval
- **`getDettaglioAtto`** — Retrieve full act text by `codiceRedazionale` and `dataGU` (Gazzetta Ufficiale publication date)
- **`getDettaglioAttoByUrn`** — Retrieve act by NIR URN identifier (e.g. `urn:nir:stato:legge:1970-05-20;300`)

#### Reference / Typological Helpers
- **`tipologicaDenominazione`** — List valid act denomination types (LEGGE, DECRETO LEGISLATIVO, etc.)
- **`tipologicaClasse`** — List valid measure class codes
- **`getEstensioni`** — List supported export file formats

#### Bulk Async Export (4-step workflow)
- **`nuovaRicercaAsincrona`** — Start an async bulk export job
- **`confermaRicercaAsincrona`** — Confirm and enqueue the job
- **`checkStatus`** — Poll job status until completion
- **`scaricaCollezioneAsincrona`** — Download the resulting ZIP archive

#### Predefined Collections
- **`ottieniCollezioniPredefinite`** — List curated dataset snapshots provided by Normattiva
- **`scaricaCollezionePreconfezionata`** — Download a named collection as a ZIP archive

### Technical Notes

- Zero runtime dependencies — pure Node.js (>=18.0.0)
- MCP protocol version 2024-11-05, JSON-RPC 2.0 over stdio
- WAF-aware request headers for reliable access to `api.normattiva.it`
- 30-second request timeout on all API calls
- Distributed as a `.mcpb` Claude Desktop Extension; installable in one click from Settings → Extensions
- 11 integration tests against the live API, all passing at release

### Data & Licensing

- Data source: [Normattiva](https://www.normattiva.it) — maintained by Istituto Poligrafico e Zecca dello Stato (IPZS)
- Data license: [IODL 2.0](https://www.dati.gov.it/content/italian-open-data-license-v20) (Italian Open Data License)
- Extension license: MIT
