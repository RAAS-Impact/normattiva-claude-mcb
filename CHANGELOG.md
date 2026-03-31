# Changelog

## [1.2.0] - 2026-03-31

### Added

- **`diritto-italiano` skill** — a unified Claude skill covering both Italian legislation and fiscal practice:
  - `skill/SKILL.md` — routing logic: directs Claude to Normattiva tools for legislation and to web navigation for fiscal guidance
  - `skill/normattiva.md` — extracted from the previous monolithic `SKILL.md`; instructions for the Normattiva MCP tools
  - `skill/interpelli.md` — new skill for finding and reading interpelli, circolari, risoluzioni and other prassi documents from `agenziaentrate.gov.it` and `def.finanze.it`

- **`test/INTERPELLI.md`** — 19-scenario manual test suite for the interpelli navigation skill, covering routing, Fonte A/B navigation, PDF delivery, pagination, error handling, and historical years

### Changed

- Skills directory restructured: `skills/interpelli/SKILL.md` and `skills/normattiva/SKILL.md` merged and reorganised into `skill/` (flat, three files)
- Integration tests moved from `test.js` to `test/normattiva.js`

### Fixed (`skill/interpelli.md`)

Five navigation bugs identified by live inspection of both sites:

- **AE — DOM container** (`agenziaentrate.gov.it`): the JS snippet used `a.closest('li, p, div')` which stopped at the `<p>` parent, returning only the title and losing the interpello number and date. Fixed by using `a.closest('.indcart_gn')` (the actual entry wrapper div) as primary selector.
- **AE — filename regex**: the regex `Risposta\+n\.\+(\d+)_(\d+)\.pdf` failed on (a) 2018 filenames where the `_ANNO` suffix is absent, (b) some 2019 filenames where the `+` after `n.` is missing, and (c) entirely non-standard 2018 filenames (e.g. `Risposta.+14.pdf`, `Risposta+n.+3_vers2.pdf`). Fixed with a two-regex approach: primary `Risposta\+n\.\+?(\d+)(?:_(\d+))?\.pdf` + fallback `Interpello\+(\d+)\+(\d{4})`.
- **def.finanze.it — result reading**: the skill said "leggi la lista di risultati" without specifying the method. Using `a.textContent` silently drops the oggetto (subject), which lives in a sibling text node inside `div.risultato-ricerca`. Explicit `get_page_text` instruction added, with `div.risultato-ricerca innerText` as JS alternative.
- **def.finanze.it — form submission**: field names (`parole`, `tipoEstremi`, `ente`, `annoDataEmissioneDa`, `annoDataEmissioneA`) and form id (`#formRicAvanzP`) were not documented; Claude had to guess. Canonical JS snippet added.
- **def.finanze.it — pagination session**: `paginatorXml.do` is server-side stateful; direct navigation resets to an unrelated page. Added note that the session is tied to the original search and must be re-run if lost.

- **AE — 2018 monthly link paths**: documented that 2018 archive month links use full sub-paths (`.../interpelli-2018/dicembre-2018-interpelli`) while later years use short slugs; `main a` selector handles both, no adaptation needed.

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

---

## [1.1.0] - 2026-03-21

### Added

- **`getEliUri`** — builds a permanent [ELI](https://eur-lex.europa.eu/eli-register/about.html) (European Legislation Identifier) URI for any act retrieved via the existing search tools. No HTTP call — pure string composition from metadata already returned by the API. Accepts `dataGU` (e.g. `"2008-04-09"`) directly from search results, or `anno`+`mese`+`giorno` separately. Supports `CONSOLIDATED` (current in-force version), `CONSOLIDATED` + `dataVersione` (point-in-time historical version), and `ORIGINAL` (text as published). URI format follows the official IPZS ELI specification for Normattiva.

### Technical Notes

- 18 integration tests (up from 11), all passing
- URI construction validated against the examples in the IPZS ELI specification document

---

### Data & Licensing

- Data source: [Normattiva](https://www.normattiva.it) — maintained by Istituto Poligrafico e Zecca dello Stato (IPZS)
- Data license: [IODL 2.0](https://www.dati.gov.it/content/italian-open-data-license-v20) (Italian Open Data License)
- Extension license: MIT
