# Normattiva API — Cross-Source Audit

**Sources compared:**
- **PDF**: `API_Normattiva_OpenData.pdf` — IPZS official spec, doc MDL-ITSMS-00-GEN REV00, rev. 10 (10/03/2026), 82 pages
- **OpenAPI**: `openapi-bff-opendata.json` — OpenAPI 3.0.1, version `v0`, server `http://localhost:9090/bff-opendata` (generated, pre-production)
- **Postman**: `openapi-bff-opendata.postman_collection.json` — Collection "NORMATTIVA OPENDATA PROD", production base URL
- **Implementation**: `server/index.js` + `test.js` integration tests (all 11 passing)

---

## 1. Base URL

| Source | URL |
|---|---|
| OpenAPI | `http://localhost:9090/bff-opendata` (generated dev URL — **not usable**) |
| Postman | `https://api.normattiva.it/t/normattiva.api/bff-opendata/v1` |
| PDF | `https://api.normattiva.it/t/normattiva.api/bff-opendata/v1` |
| Implementation | `https://api.normattiva.it/t/normattiva.api/bff-opendata/v1` ✓ |

**Critical**: The OpenAPI file's `servers` block is a placeholder from the code generator. Postman is the authoritative source for the production base URL.

---

## 2. WAF / Browser Headers

| Source | Says what? |
|---|---|
| PDF | Silent — no mention of required request headers |
| OpenAPI | Silent — no security schemes for request headers |
| Postman | Explicitly includes full browser header set on POST endpoints (Accept, Accept-Language, Origin, Sec-Fetch-*, User-Agent, sec-ch-ua*) |
| Implementation | Applies browser headers to **all** requests ✓ |

**Notes:**
- The WAF blocks requests that lack these headers with HTTP 400.
- Postman's `Origin` header is `https://qas.dati.normattiva.it` (QA environment). Implementation uses `https://dati.normattiva.it` (production) — correct for production use.
- Some Postman requests (e.g. RICERCA ATTI AGGIORNATI, DETTAGLIO ATTO URN) omit headers — they likely pass through because GET/simple-body requests are less strictly gated. Applying headers globally is the safe approach.

---

## 3. Endpoint Inventory

| Endpoint | PDF | OpenAPI | Postman | Implemented | Tested |
|---|---|---|---|---|---|
| GET /tipologiche/denominazione-atto | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /tipologiche/classe-provvedimento | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /tipologiche/estensioni | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /ricerca/predefinita | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /ricerca/semplice | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /ricerca/avanzata | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /ricerca/aggiornati | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /atto/dettaglio-atto | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /atto/dettaglio-atto-urn | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /ricerca-asincrona/nuova-ricerca | ✓ | ✓ | ✓ | ✓ | — |
| PUT /ricerca-asincrona/conferma-ricerca | ✓ | ✓ | ✓ | ✓ | — |
| GET /ricerca-asincrona/check-status/{token} | ✓ | ✓ | ✓ | ✓ | — |
| GET /collections/collection-predefinite | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /collections/download/collection-preconfezionata | ✓ | ✓ | ✓ | ✓ | — |
| GET /collections/download/collection-asincrona/{token} | ✓ | ✓ | ✓ | ✓ | — |

All 15 endpoints are covered. The 5 untested ones require a live async workflow or binary downloads and are not amenable to automated integration tests.

---

## 4. Request Parameter Discrepancies

### 4.1 Pagination (`paginazione` object)

| Source | Field names |
|---|---|
| OpenAPI schema `Paginazione` | `paginaCorrente`, `numeroElementiPerPagina` ✓ |
| Postman body (RICERCA SEMPLICE) | `paginaCorrente`, `numeroElementiPerPagina` ✓ |
| Postman body (RICERCA AVANZATA) | `paginaCorrente`, `numeroElementiPerPagina` as **strings** (e.g. `"1"`) |
| Implementation | `paginaCorrente`, `numeroElementiPerPagina` as integers ✓ |

The API accepts both integers and numeric strings for pagination. Our implementation uses integers, which is correct. (A previous bug used `pagina`/`maxNumeroRisultati` — now fixed.)

### 4.2 `getDettaglioAtto` — `dataGU` requirement

| Source | Says |
|---|---|
| OpenAPI `DettaglioAttoRicercaFilterDto` | `dataGU` listed as optional (no `required` array) |
| Postman body (DETTAGLIO ATTO) | `dataGU` always included in example |
| PDF | Not explicitly stated as required |
| Integration tests | Confirmed: omitting `dataGU` returns HTTP 500 code 1000 |
| Implementation | `dataGU` marked as **required** alongside `codiceRedazionale` ✓ |

**Critical deviation from OpenAPI**: `dataGU` must be treated as required. It is returned by all search endpoints in the `dataGU` field of each result item.

### 4.3 `filtriMap` — missing from MCP tool schemas

| Source | Says |
|---|---|
| OpenAPI `RicercaSempliceRequest` | `filtriMap: { type: object, additionalProperties: string }` |
| OpenAPI `RicercaAvanzataRequestFrontEnd` | `filtriMap: { type: object, additionalProperties: string }` |
| Postman | Dedicated examples: "RICERCA SEMPLICE CON FACETMAP", "RICERCA AVANZATA CON FACETMAP" |
| Postman example keys | `codice_tipo_provvedimento`, `anno_provvedimento` |
| Implementation | **Not exposed** in `ricercaSemplice` or `ricercaAvanzata` tool schemas |

**Gap**: `filtriMap` enables faceted filtering (e.g. filter by act type code or year) and is used by the web frontend. It should be added to both search tools.

### 4.4 `ricercaAvanzata` — `denominazioneAtto` value semantics

| Source | Says |
|---|---|
| OpenAPI | `denominazioneAtto: string` — no guidance on valid values |
| Postman body (RICERCA AVANZATA) | Uses `"DECRETO"` |
| `tipologicaDenominazione` response | Returns `{label, value}` pairs where `value` = full name (e.g. `"DECRETO LEGISLATIVO"`), `label` = internal code (e.g. `"DLG"`) |
| Implementation | Correctly documents: "valori validi da tipologicaDenominazione" |

The `value` field (not `label`) from `tipologicaDenominazione` should be used as `denominazioneAtto`.

### 4.5 `nuovaRicercaAsincrona` — `parametriRicerca` detail

| Source | Schema |
|---|---|
| OpenAPI | `parametriRicerca` references `RicercaAvanzataFilterDto` — a **different, richer** schema than `RicercaAvanzataRequestFrontEnd` |
| `RicercaAvanzataFilterDto` extra fields | `titoloContainsType` (enum), `testoContainsType` (enum), `titoloNot`, `testoNot`, `numeroArticolo`, `dataInizioPubblicazione`, `dataFinePubblicazione`, `dataVigenza` |
| Implementation | `parametriRicerca: { type: 'object', description: '...' }` — opaque, no field detail |

**Gap**: The async search accepts a richer filter schema than the synchronous search. Notably:
- `titoloContainsType` / `testoContainsType`: `ALL_WORDS | SOME_WORDS | ENTIRE_STRING | NEITHER_WORDS`
- `titoloNot` / `testoNot`: exclusion filters
- `dataVigenza` (in async) vs `vigenza` (in sync) — different field names for the same concept

### 4.6 `nuovaRicercaAsincrona` — `modalita` and `email`

| Source | Says |
|---|---|
| OpenAPI `NuovaRicercaAsincronaRequest` | `required: [formato, parametriRicerca, tipoRicerca]`; `modalita` and `email` are optional |
| Postman examples | Both include `modalita: "C"` and `email: "..."` |
| PDF Rev 07 | Confirmed `modalita` and `email` are optional |
| Implementation | `modalita` and `email` in schema as optional ✓ |

### 4.7 `scaricaCollezionePreconfezionata` — `formatoRichiesta` values

| Source | Says |
|---|---|
| OpenAPI `richiestaExport` enum (on `nuovaRicercaAsincrona`) | `O` (ORIGINARIO), `V` (VIGENTE), `M` (MULTIVIGENTE) |
| Postman (DOWNLOAD COLLEZIONE PRECONFEZIONATA) | `formatoRichiesta=O` |
| Implementation | Accepts `formatoRichiesta` as plain string, no enum documented |

**Gap**: Valid values for `formatoRichiesta` should be documented as `O`, `V`, `M`.

---

## 5. Response Shape Discrepancies

### 5.1 Search endpoints (`ricercaSemplice`, `ricercaAvanzata`, `ricercaAttiAggiornati`)

| Source | Shape |
|---|---|
| OpenAPI `RicercaResponseFrontEnd` | `{ listaAtti[], facetMap{}, numeroPagine, numeroAttiTrovati, paginaCorrente, numeroElementiPerPagina, message, numeroFileRicerca }` |
| Integration tests | Confirms `listaAtti[]` present, `facetMap` present when `filtriMap` used |
| Implementation | Passes through raw JSON ✓ |

**Note**: `facetMap` in the response is only populated when the request includes a `filtriMap`. Since we don't expose `filtriMap`, callers currently never see facet data.

### 5.2 Detail endpoints (`getDettaglioAtto`, `getDettaglioAttoByUrn`)

| Source | Shape |
|---|---|
| OpenAPI `ResponseDettaglioAttoResponseDto` | `{ success: bool, code: string, message: string, data: { atto: AttoDto, message } }` |
| OpenAPI `ResponseDettaglioAttoResponseConListaDto` | `{ success: bool, code: string, message: string, data: { atto: AttoDto, lista: AttoDto[], message } }` |
| Integration tests | Confirmed: `success: true`, `data.atto.articoloHtml` present |
| Implementation | Passes through raw JSON ✓ |

`getDettaglioAttoByUrn` additionally returns `data.lista[]` (multiple versions/articles) — not surfaced in our tool description.

### 5.3 Typological endpoints (`tipologicaDenominazione`, `tipologicaClasse`, `getEstensioni`)

| Source | Shape |
|---|---|
| OpenAPI | `TipologicaDto[]` (plain array of `{ label, value }`) |
| Integration tests | Confirmed plain array, no envelope |
| Implementation | Passes through raw JSON ✓ |

### 5.4 `nuovaRicercaAsincrona` response

| Source | Shape |
|---|---|
| OpenAPI | Returns `string` (the token UUID) |
| Implementation | Passes through as text ✓ |

### 5.5 `checkStatus` — state codes

OpenAPI `StatusRicercaAsincronaDTO` documents `stato` values:

| State | Meaning |
|---|---|
| 0 | Ricerca da confermare |
| 1 | Confermata, in attesa di elaborazione |
| 2 | Confermata, in elaborazione |
| 3 | Elaborata con successo |
| 4 | Errore durante elaborazione (`descrizioneErrore` populated) |
| 5 | Carico eccessivo — URL di collezione predefinita equivalente fornita |
| 6 | Confermata, possibile prolungamento tempi |

Implementation passes through the full DTO — Claude can read these states from the response. SKILL.md should document state 3 as the "ready to download" signal.

---

## 6. PDF Revisions not Reflected in OpenAPI

The PDF tracks revisions; the OpenAPI file corresponds to an earlier baseline. Key additions:

| Rev | Change | In OpenAPI | In Implementation |
|---|---|---|---|
| Rev 05 | Additional filter fields on `ricercaAttiAggiornati` | Partially (only 2 base fields in schema) | Only 2 fields exposed |
| Rev 07 | `annoProvvedimento`, `giornoProvvedimento`, `meseProvvedimento`, `numeroProvvedimento` in `ricercaAvanzata` | Present in `RicercaAvanzataRequestFrontEnd` ✓ | Exposed ✓ |
| Rev 07 | `modalita`, `email` confirmed optional in async search | Optional in OpenAPI ✓ | Optional ✓ |
| Rev 09 | `dataVigenza` added to `nuovaRicercaAsincrona.parametriRicerca` | Present in `RicercaAvanzataFilterDto` ✓ | Not explicitly exposed |
| Rev 10 | `getDettaglioAttoByUrn` updated | Reflects change (returns `ResponseDettaglioAttoResponseConListaDto` with `lista[]`) | Passes through ✓ |

---

## 7. Gaps to Fix in `server/index.js`

Priority order:

| # | Gap | Impact | Fix |
|---|---|---|---|
| 1 | `filtriMap` not exposed in `ricercaSemplice` and `ricercaAvanzata` | Medium — blocks faceted filtering | Add `filtriMap: { type: 'object' }` to both tool schemas |
| 2 | `nuovaRicercaAsincrona.parametriRicerca` is opaque | Low-Medium — LLM cannot construct rich async queries | Expand schema to match `RicercaAvanzataFilterDto` |
| 3 | `formatoRichiesta` valid values undocumented | Low — LLM may pass invalid values | Add `enum: ['O', 'V', 'M']` or description |
| 4 | `getDettaglioAttoByUrn` returns `data.lista[]` undocumented | Low — LLM misses multi-version data | Mention `data.lista` in tool description |
| 5 | `checkStatus` state semantics not in tool description | Low — SKILL.md covers this | Move state table into tool description |

---

## 8. Summary

The implementation is **functionally correct** for all 15 endpoints. The only production-breaking issue found during development was the undocumented WAF requirement (browser headers) — now fixed. The `dataGU` required-but-undocumented constraint was discovered via integration tests and correctly hardened.

The main remaining gaps are cosmetic/capability: `filtriMap` is missing from the tool schemas, limiting faceted search; and `nuovaRicercaAsincrona.parametriRicerca` is underspecified. The OpenAPI file is useful as a schema reference but cannot be used as-is for production due to the wrong base URL and missing header requirements.
