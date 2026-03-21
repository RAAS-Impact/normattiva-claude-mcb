---
name: normattiva
description: >
  How to query, search, and retrieve Italian legislation from Normattiva
  (dati.normattiva.it) using the Normattiva MCP server tools. Use this skill
  whenever the user wants to find Italian laws, decrees, legislative acts,
  or any content from the official Italian legislation database — even if they
  just say "look up Italian law", "find the decree about X", "search normattiva",
  or "what does Italian law say about Y". Also trigger when the user asks to
  browse, download, or export collections of Italian legislative acts.
---

# Normattiva MCP Skill

Normattiva (`dati.normattiva.it`) is Italy's official consolidated legislation database. The MCP server wraps its REST API, so all tool names and field names are in Italian. This skill explains what the tools do and how to combine them correctly.

---

## Identifying acts

Two identifiers appear throughout the API:

- **`codiceRedazionale`**: an alphanumeric code like `"056U0675"` — the primary key for an act in Normattiva. You'll get these back from search results.
- **URN**: a structured string like `urn:nir:stato:legge:1975-05-23;654` — useful when the user already has a reference from an external source.

---

## Choosing a search approach

### Quick free-text search → `ricercaSemplice`
Use this for natural-language queries ("legge sulla privacy", "decreto sicurezza sul lavoro"). Send `testoRicerca` with the search terms. Results come back paginated in `listaAtti`; each item contains `codiceRedazionale` you can use to fetch the full act.

### Filtered search → `ricercaAvanzata`
Use when the user specifies structured criteria: act type (`classeProvvedimento`), date range (`dataInizioEmanazione` / `dataFineEmanazione`), act number (`numeroProvvedimento`), issuing body, etc. Before calling this, fetch valid filter values from the typological helpers below to avoid sending invalid codes.

For `denominazioneAtto`, pass the `value` field from `tipologicaDenominazione` (e.g. `"DECRETO LEGISLATIVO"`), not the `label` code (e.g. `"PLL"`).

### Acts modified in a date range → `ricercaAttiAggiornati`
Use this when the user asks "what laws changed between date A and date B". Requires `dataInizioAggiornamento` and `dataFineAggiornamento`. Returns paginated results like `ricercaSemplice`. For bulk export of these results, chain into the async workflow below.

### Not sure where to start → `ricercaPredefinita`
Returns preset search configurations the platform provides. Useful when the user has no specific query and wants to browse categories.

---

## Getting the text of an act

After identifying an act from search results:

- **By code**: `getDettaglioAtto` — pass `codiceRedazionale` **and** `dataGU` (both are returned by every search tool). Optionally pass `idArticolo` to retrieve a specific article rather than the whole act.
- **By URN**: `getDettaglioAttoByUrn` — pass the URN string directly.

Both return the act text and metadata (title, date, issuing body, current consolidated version).

---

## Typological helpers (fetch valid filter values)

Call these before constructing a `ricercaAvanzata` request so you pass values the API actually accepts:

| Tool | What it returns |
|---|---|
| `tipologicaDenominazione` | Act denomination types (e.g. "legge", "decreto legislativo") |
| `tipologicaClasse` | Measure classes for `classeProvvedimento` filter |
| `getEstensioni` | Supported export file formats |

---

## Bulk/async workflow (exporting collections)

For large exports (many acts at once), the API uses a 4-step async flow. Use this when the user wants to download a dataset, not just read a single act.

1. **`nuovaRicercaAsincrona`** — submit the search with `parametriRicerca`, `tipoRicerca`, and `formato`. Returns a `token`.
2. **`confermaRicercaAsincrona`** — confirm the request by sending back the `token`. The server queues the job.
3. **`checkStatus`** — poll with `{ token }` until `stato` is a terminal value. Watch `descrizioneStato` for human-readable progress. Field `percentuale` gives completion percentage.
4. **`scaricaCollezioneAsincrona`** — once complete, call with `{ token }` to download the resulting ZIP archive.

Poll `checkStatus` with a reasonable interval (a few seconds); don't hammer it. The `stato` codes 0–6 represent different phases; `descrizioneStato` will tell you if it failed.

---

## Predefined collections

Normattiva also offers curated dataset snapshots:

- **`ottieniCollezioniPredefinite`** — list available collections (returns `nomeCollezione`, format info, act count, creation date).
- **`scaricaCollezionePreconfezionata`** — download a named collection as a ZIP. Pass `nome` and `formato`.

---

## ELI — European Legislation Identifier

Normattiva exposes every act via a permanent ELI URI. Two tools handle this; both work from metadata already returned by search and detail tools — no extra search needed.

### `getEliUri` — build a permanent link (no HTTP call)

Pass `codiceRedazionale` and the publication date. The preferred form is **`dataGU`** (e.g. `"2008-04-09"`) — it is already returned by every search and detail tool. Alternatively pass `anno`, `mese`, `giorno` separately.

Key parameter: **`dataVersione`** (format `"yyyymmdd"`) — use this when you need the version of the law as it stood on a specific date (e.g. `"20150101"`). Maps directly to `dataVigenza` from `getDettaglioAtto`. Without it, CONSOLIDATED returns the current in-force version.

URI shape (per IPZS spec, always includes `/ita/html`):
- Current consolidated: `.../008G0073/CONSOLIDATED/ita/html`
- Historical point-in-time: `.../008G0073/CONSOLIDATED/20150101/ita/html`
- Original at publication: `.../008G0073/ORIGINAL/ita/html`

After retrieving any act, always call `getEliUri` to provide a permanent, browser-navigable, citable reference.

---

## Practical tips

- Always check `listaAtti` for search results and `codiceRedazionale` on each item.
- If a user gives you a law name like "Legge 300/1970" (Statuto dei lavoratori), use `ricercaAvanzata` with `numeroProvvedimento: "300"` and year filter rather than free text — it's more precise.
- The API is Italian-only; respond to the user in their language but know that tool parameters/responses are in Italian.
- For article-level retrieval, you need both `codiceRedazionale` and `idArticolo`; get the article list from `getDettaglioAtto` first (without `idArticolo`) to see available sections.
- After retrieving any act, routinely offer the ELI URI via `getEliUri` — it costs nothing and gives the user a permanent, citable reference.
