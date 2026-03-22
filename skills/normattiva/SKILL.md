---
name: normattiva
description: >
  Come cercare e recuperare la normativa italiana da Normattiva
  (dati.normattiva.it) usando gli strumenti MCP del server Normattiva. Usa questa skill
  quando l'utente vuole trovare leggi, decreti, atti legislativi italiani
  o qualsiasi contenuto dalla banca dati ufficiale della normativa italiana — anche se
  dice semplicemente "cerca la legge su X", "trova il decreto Y", "cerca su normattiva"
  o "cosa dice la legge italiana su Z". Attiva anche quando l'utente vuole
  sfogliare, scaricare o esportare collezioni di atti normativi italiani.
---

# Normattiva MCP Skill

Normattiva (`dati.normattiva.it`) è la banca dati ufficiale della normativa italiana consolidata. Il server MCP espone le sue API REST: tutti i nomi dei tool e dei campi sono in italiano. Questa skill spiega cosa fa ciascun tool e come combinarli correttamente.

---

## Identificare gli atti

Due identificatori ricorrono in tutta l'API:

- **`codiceRedazionale`**: codice alfanumerico come `"056U0675"` — chiave primaria di un atto in Normattiva. Viene restituito dai risultati di ricerca.
- **URN**: stringa strutturata come `urn:nir:stato:legge:1975-05-23;654` — utile quando l'utente ha già un riferimento da una fonte esterna.

---

## Scegliere l'approccio di ricerca

### Ricerca libera → `ricercaSemplice`
Usare per query in linguaggio naturale ("legge sulla privacy", "decreto sicurezza sul lavoro"). Passare `testoRicerca` con i termini di ricerca. I risultati tornano paginati in `listaAtti`; ogni elemento contiene il `codiceRedazionale` per recuperare l'atto completo.

### Ricerca con filtri → `ricercaAvanzata`
Usare quando l'utente specifica criteri strutturati: tipo di atto (`classeProvvedimento`), intervallo di date (`dataInizioEmanazione` / `dataFineEmanazione`), numero dell'atto (`numeroProvvedimento`), ente emanante, ecc. Prima di chiamarla, recuperare i valori validi dai tool tipologici per evitare di inviare codici non accettati.

Per `denominazioneAtto`, passare il campo `value` da `tipologicaDenominazione` (es. `"DECRETO LEGISLATIVO"`), non il codice `label` (es. `"PLL"`).

### Atti modificati in un intervallo di date → `ricercaAttiAggiornati`
Usare quando l'utente chiede "quali leggi sono cambiate tra la data A e la data B". Richiede `dataInizioAggiornamento` e `dataFineAggiornamento`. Restituisce risultati paginati come `ricercaSemplice`. Per esportare i risultati in bulk, concatenare con il flusso asincrono descritto sotto.

### Punto di partenza sconosciuto → `ricercaPredefinita`
Restituisce configurazioni di ricerca predefinite dalla piattaforma. Utile quando l'utente non ha una query specifica e vuole sfogliare le categorie.

---

## Recuperare il testo di un atto

Dopo aver identificato un atto dai risultati di ricerca:

- **Per codice**: `getDettaglioAtto` — passare `codiceRedazionale` **e** `dataGU` (entrambi restituiti da ogni tool di ricerca). Passare opzionalmente `idArticolo` per recuperare un articolo specifico invece dell'intero atto.
- **Per URN**: `getDettaglioAttoByUrn` — passare direttamente la stringa URN.

Entrambi restituiscono il testo dell'atto e i metadati (titolo, data, ente emanante, versione consolidata corrente).

---

## Tool tipologici (valori validi per i filtri)

Chiamare questi tool prima di costruire una richiesta `ricercaAvanzata` per passare valori accettati dall'API:

| Tool | Cosa restituisce |
|---|---|
| `tipologicaDenominazione` | Tipi di denominazione degli atti (es. "legge", "decreto legislativo") |
| `tipologicaClasse` | Classi provvedimento per il filtro `classeProvvedimento` |
| `getEstensioni` | Formati di file supportati per l'esportazione |

---

## Flusso bulk/asincrono (esportazione di collezioni)

Per esportazioni grandi (molti atti contemporaneamente), l'API usa un flusso asincrono in 4 passi. Usare quando l'utente vuole scaricare un dataset, non solo leggere un singolo atto.

1. **`nuovaRicercaAsincrona`** — inviare la ricerca con `parametriRicerca`, `tipoRicerca` e `formato`. Restituisce un `token`.
2. **`confermaRicercaAsincrona`** — confermare la richiesta rinviando il `token`. Il server mette in coda il job.
3. **`checkStatus`** — fare polling con `{ token }` finché `stato` non è un valore terminale. Monitorare `descrizioneStato` per il progresso leggibile. Il campo `percentuale` indica la percentuale di completamento.
4. **`scaricaCollezioneAsincrona`** — a completamento avvenuto, chiamare con `{ token }` per scaricare l'archivio ZIP risultante.

Fare polling di `checkStatus` a intervalli ragionevoli (qualche secondo); non sovraccaricare l'API. I codici `stato` da 0 a 6 rappresentano fasi diverse; `descrizioneStato` indicherà in caso di fallimento.

---

## Collezioni predefinite

Normattiva offre anche snapshot curati di dataset:

- **`ottieniCollezioniPredefinite`** — elenca le collezioni disponibili (restituisce `nomeCollezione`, informazioni sul formato, numero di atti, data di creazione).
- **`scaricaCollezionePreconfezionata`** — scarica una collezione nominata come ZIP. Passare `nome` e `formato`.

---

## ELI — European Legislation Identifier

Normattiva espone ogni atto tramite un URI ELI permanente. Due tool gestiscono questo; entrambi lavorano dai metadati già restituiti dai tool di ricerca e dettaglio — nessuna ricerca aggiuntiva necessaria.

### `getEliUri` — costruire un link permanente (nessuna chiamata HTTP)

Passare `codiceRedazionale` e la data di pubblicazione. La forma preferita è **`dataGU`** (es. `"2008-04-09"`) — già restituita da ogni tool di ricerca e dettaglio. In alternativa passare `anno`, `mese`, `giorno` separatamente.

Parametro chiave: **`dataVersione`** (formato `"yyyymmdd"`) — usare quando si ha bisogno della versione della legge com'era a una data specifica (es. `"20150101"`). Corrisponde direttamente a `dataVigenza` da `getDettaglioAtto`. Senza di esso, CONSOLIDATED restituisce la versione attualmente in vigore.

Forma dell'URI (per specifica IPZS, include sempre `/ita/html`):
- Versione consolidata corrente: `.../008G0073/CONSOLIDATED/ita/html`
- Versione storica a una data: `.../008G0073/CONSOLIDATED/20150101/ita/html`
- Testo originale alla pubblicazione: `.../008G0073/ORIGINAL/ita/html`

Dopo aver recuperato qualsiasi atto, chiamare sempre `getEliUri` per fornire un riferimento permanente, navigabile nel browser e citabile.

---

## Suggerimenti pratici

- Controllare sempre `listaAtti` per i risultati di ricerca e `codiceRedazionale` su ciascun elemento.
- Se l'utente fornisce un nome di legge come "Legge 300/1970" (Statuto dei lavoratori), usare `ricercaAvanzata` con `numeroProvvedimento: "300"` e filtro per anno piuttosto che la ricerca libera — è più preciso.
- L'API è solo in italiano; rispondere all'utente nella sua lingua sapendo che i parametri e le risposte dei tool sono in italiano.
- Per il recupero a livello di articolo, servono sia `codiceRedazionale` che `idArticolo`; ottenere prima la lista degli articoli da `getDettaglioAtto` (senza `idArticolo`) per vedere le sezioni disponibili.
- Dopo aver recuperato qualsiasi atto, offrire sempre l'URI ELI tramite `getEliUri` — non ha costo e fornisce all'utente un riferimento permanente e citabile.
