---
name: interpelli
description: >
  Come cercare e consultare la prassi fiscale italiana: risposte agli interpelli,
  circolari, risoluzioni e altri documenti emessi da Agenzia delle Entrate, Ministeri,
  INPS, Agenzia delle Dogane e altri enti. Usa questa skill quando l'utente chiede
  cosa dice l'Amministrazione finanziaria su un argomento fiscale, cerca un interpello
  specifico per numero o data, vuole sapere la posizione ufficiale di un ente su una
  norma tributaria, o fa domande del tipo "cosa dice l'AdE su X", "c'è un interpello
  su Y", "qual è la posizione del Fisco su Z".
---

# Skill: Prassi Fiscale Italiana (Interpelli e documenti collegati)

---

## 1. Cos'è un interpello (conoscenza di dominio)

Un **interpello** è una richiesta formale con cui un contribuente (o il suo rappresentante) chiede a un'autorità fiscale di esprimere il proprio parere interpretativo su una norma tributaria applicata a una situazione concreta e personale. La risposta dell'ente è vincolante solo per il soggetto che ha presentato l'istanza.

### Tipologie di interpello (AdE)
- **Ordinario**: interpretazione di norme obiettivamente incerte rispetto a un caso specifico
- **Probatorio**: verifica della sussistenza di condizioni o idoneità di elementi probatori per accedere a un regime fiscale
- **Anti-abuso**: valutazione preventiva se un'operazione configura abuso del diritto
- **Disapplicativo**: richiesta di disapplicare norme antielusive in presenza di condizioni specifiche
- **Nuovi investimenti**: per piani di investimento rilevanti in Italia da parte di soggetti non residenti

### Prassi: il quadro più ampio
L'interpello è solo una delle forme con cui gli enti fiscali producono **prassi**, ovvero documenti interpretativi ufficiali. Le altre tipologie principali sono:
- **Circolare**: istruzione interpretativa o applicativa di carattere generale, rivolta agli uffici e ai contribuenti
- **Risoluzione**: risposta a quesiti specifici, storicamente il precedente dell'interpello moderno
- **Nota / Direttiva**: comunicazioni interne o indirizzate ad altri enti
- **Consulenza giuridica**: risposta a quesiti di associazioni di categoria o ordini professionali (non del singolo contribuente)

### Enti che producono prassi fiscale rilevante
Non solo l'Agenzia delle Entrate. Tra i principali:
- **Agenzia delle Entrate** — tributi erariali (IRPEF, IRES, IVA, imposte di registro, ecc.)
- **Agenzia delle Dogane e dei Monopoli** — accise, dazi, dogane
- **Ministero dell'Economia e delle Finanze (MEF) / Dipartimento delle Finanze** — politica fiscale, norme di attuazione
- **Ministero del Lavoro e delle Politiche Sociali** — aspetti fiscali del lavoro
- **INPS** — previdenza e contributi
- **Guardia di Finanza** — applicazione delle norme tributarie
- **IVASS** — assicurazioni
- **Banca d'Italia / CONSOB** — aspetti fiscali di strumenti finanziari

---

## 2. Le fonti disponibili

Questa skill usa due fonti complementari. Ogni fonte ha un ambito diverso: **non sono intercambiabili**.

### Fonte A — Agenzia delle Entrate (`agenziaentrate.gov.it`)

**Cosa contiene:**
- Esclusivamente le **risposte agli interpelli dell'Agenzia delle Entrate**
- Copertura: **dal 1° settembre 2018** in poi (pubblicazione resa obbligatoria per legge)
- Include anche: interpelli sui nuovi investimenti, princìpi di diritto, risposte a consulenza giuridica

**Cosa NON contiene:**
- Circolari, risoluzioni, note
- Prassi di enti diversi da AdE
- Interpelli AdE precedenti al 2018

**Struttura di navigazione:**
- Archivio per anno: `https://www.agenziaentrate.gov.it/portale/interpelli-[ANNO]` (es. `/portale/interpelli-2025`)
- Ogni anno → lista di mesi con i rispettivi href — **gli URL mensili NON sono costruibili a priori**: vanno letti direttamente dalla pagina annuale tramite `javascript_tool` (`document.querySelectorAll('main a')`), perché il pattern è irregolare (es. Febbraio 2026 è `/portale/febbraio-20261`, non `/portale/febbraio-2026-interpelli`)
- Ogni mese → lista di voci nel formato "Risposta n. [N] del [GG/MM/AAAA] — [oggetto]" con link diretto al PDF
- I link PDF si trovano **fuori dal tag `<main>`**: usare `document.querySelectorAll('a[href*="pdf"]')` sull'intero documento
- PDF con UUID imprevedibile: non costruibile dall'esterno, va letto dalla pagina mensile

**Quando usarla:**
- L'utente cerca un interpello AdE per **numero e/o anno** specifici (es. "interpello n. 82 del 2026")
- L'utente vuole **scorrere gli interpelli recenti** di AdE per periodo

---

### Fonte B — def.finanze.it (`def.finanze.it/DocTribFrontend`)

**Cosa contiene:**
- **Tutta la prassi fiscale italiana** — interpelli, circolari, risoluzioni, note, direttive, delibere, comunicati stampa — di **decine di enti pubblici** (ministeri, agenzie, autorità di vigilanza, INPS, Banca d'Italia, CONSOB, ecc.)
- Gli interpelli AdE sono inclusi **dal 2022** (quando è stata avviata l'integrazione con il portale AE)
- Copertura storica molto più ampia rispetto al sito AdE

**Cosa NON contiene:**
- Interpelli AdE dal 2018 al 2021 in modo completo (la copertura può essere parziale per quel periodo)

**Struttura di navigazione:**
- Ricerca semplice: POST a `https://def.finanze.it/DocTribFrontend/executeSearch.do`
  - Campo `ambitoRicerca`: `P` per Prassi (usare sempre questo per interpelli e prassi)
  - Campi `parole`, `anno`, `numero` per filtrare
- Ricerca avanzata: `https://def.finanze.it/DocTribFrontend/callRicAvanzataPrassi.do?js_enabled=1&reset=y`
  - La pagina contiene due form: usare sempre `form[action*="executeAdvancedPrassiSearch"]`
  - Filtri aggiuntivi: `tipoEstremi` (Interpello / Circolare / Risoluzione / ...) e `ente` (Agenzia delle Entrate / Min. Lavoro / ...)
- Risultati: lista di link a `getPrassiDetail.do?id={GUID}`
- Pagina di dettaglio: metadati (data, numero, ente, oggetto) + link al PDF tramite `getContent.do?id={GUID-diverso}`

**Quando usarla:**
- L'utente cerca per **argomento** senza specificare ente o numero ("cosa dice la prassi su X")
- L'utente cerca prassi di **enti diversi da AdE**
- L'utente cerca **circolari, risoluzioni** o altri tipi di prassi (non solo interpelli)
- Punto di ingresso predefinito per qualsiasi ricerca per contenuto

---

## 3. Routing: quale fonte usare

Prima di navigare, classifica la richiesta:

| Tipo di richiesta | Fonte primaria | Note |
|---|---|---|
| Numero e anno specifico AdE ("interpello 82/2026") | **Fonte A** (AE) | Navigazione diretta per anno/mese |
| Argomento generico ("cosa dice l'AdE su X") | **Fonte B** (def.finanze) | Full-text search |
| Ente non-AdE ("circolare INPS su X") | **Fonte B** (def.finanze) | Filtrare per ente |
| Tipo non-interpello ("circolari su X") | **Fonte B** (def.finanze) | Filtrare per tipoEstremi |
| Browsing recente AdE | **Fonte A** (AE) | Homepage o anno corrente |
| Argomento + periodo specifico | **Fonte B** (def.finanze) | Filtro per parole + anno |

---

## 4. Flusso operativo

Segui sempre questo flusso in cinque passi:

### Passo 1 — Classifica la richiesta
Determina: è una ricerca per numero/data? Per argomento? Quale ente? Quale tipo di documento?

### Passo 2 — Naviga la fonte appropriata

**Fonte A (AE) — ricerca per numero/anno:**
1. Naviga `https://www.agenziaentrate.gov.it/portale/interpelli-[ANNO]`
   - Se la pagina restituisce 404, tenta il percorso alternativo per anni storici:
     `https://www.agenziaentrate.gov.it/portale/normativa-e-prassi/risposte-agli-interpelli/interpelli/archivio-interpelli/interpelli-[ANNO]`
   - Se anche questo restituisce 404, naviga la pagina radice dell'archivio generale degli interpelli: `https://www.agenziaentrate.gov.it/portale/normativa-e-prassi/risposte-agli-interpelli/interpelli/archivio-interpelli`
   - Se anche questo restituisce 404, comunica il problema all'utente senza inventare risultati
2. Usa `javascript_tool` con `document.querySelectorAll('main a')` per leggere gli href reali dei mesi — non costruire gli URL a mano (il pattern è inconsistente tra anni storici e recenti)
3. Individua il mese corretto dall'indicazione "dalla n° X alla n° Y" e naviga quell'href
4. Usa `javascript_tool` con questa query (i link PDF sono fuori da `<main>`, quindi si uniscono testo e href in un'unica chiamata):
   ```js
   JSON.stringify(Array.from(document.querySelectorAll('a[href*="pdf"]')).map(a => ({
     testo: a.closest('li, p, div')?.textContent?.trim() || a.textContent.trim(),
     href: a.href
   })))
   ```
5. Annota internamente l'href del PDF corrispondente al numero cercato — **non navigare al PDF**. La pagina mensile deve restare aperta nel browser fino a che l'utente non conferma di voler leggere il documento.

**Fonte B (def.finanze) — ricerca per argomento:**
1. Naviga `https://def.finanze.it/DocTribFrontend/callRicAvanzataPrassi.do?js_enabled=1&reset=y` per ricerca avanzata
2. Compila il campo "Parole" con i termini chiave
3. Se opportuno, filtra per `tipoEstremi` (es. "Interpello") e/o per `ente` (es. "Agenzia delle Entrate")
4. Invia la ricerca e leggi la lista di risultati: titolo, data, ente, oggetto di ciascun documento

### Passo 3 — Presenta la lista all'utente
Mostra i risultati trovati con: tipo documento, numero, data, ente, oggetto/titolo.
**Non aprire ancora i PDF.** Chiedi all'utente quale documento vuole approfondire.

### Passo 4 — Consegna il documento all'utente
Quando l'utente indica quale documento vuole:

1. Ottieni l'URL del PDF:
   - **Fonte A**: usa l'href già annotato nel Passo 2 step 5. Se il browser non è più sulla pagina mensile, torna alla pagina mensile e riesegui la query `javascript_tool` del Passo 2 step 4 — **non eseguire il selettore su una pagina PDF già aperta**.
   - **Fonte B**: naviga `getPrassiDetail.do?id={GUID}` e leggi `document.querySelector('a[href*="getContent.do"]').href`
2. Costruisci l'URL cliccabile: prendi l'href del PDF e percent-encoda i caratteri `{` → `%7B` e `}` → `%7D` (necessario perché le graffe rompono il parser markdown). Es: `getContent.do?id={17FC0849}` → `getContent.do?id=%7B17FC0849%7D`. Chiama questo valore `[URL_ENCODED]`.

3. Mostra all'utente il messaggio seguente (sostituendo `[TITOLO]` e `[URL_ENCODED]` con i valori reali):

   > Ho trovato il documento: **[TITOLO]**
   >
   > Non posso aprire i PDF direttamente. Scaricalo qui: [Apri documento]([URL_ENCODED])
   >
   > Poi scegli come condividermelo:
   > - **Solo per questa conversazione** → trascinalo nella chat (o usa l'icona allegato)
   > - **Per tutte le sessioni future** → aggiungilo ai file del progetto (*Progetto → Aggiungi file*)
   >
   > Appena è disponibile, lo analizzo subito.

4. Attendi che l'utente alleghi il file alla chat.

### Passo 5 — Analizza e cita
Quando il PDF è disponibile — allegato nella chat **oppure** già presente nei file del progetto — leggilo e riassumi il contenuto in risposta alla domanda originale. Indica sempre: tipo documento, numero, data, ente emanante, e link diretto al documento.

Se il documento è già nei file del progetto (l'utente lo segnala o lo si riconosce dal contesto), non chiedere di allegarlo nuovamente: è già leggibile.

---

## 5. Note operative

- Usa i tool `mcp__Claude_in_Chrome__*` per navigare: `navigate`, `get_page_text`, `javascript_tool`
- Le pagine di entrambi i siti sono server-rendered: `get_page_text` è sufficiente per leggere lista di risultati e metadati
- **I PDF non si scaricano automaticamente**: mostrare sempre l'URL all'utente e attendere che alleghi il file come descritto al Passo 4
- Non costruire mai URL mensili AE a mano: leggerli sempre dalla pagina annuale con `javascript_tool`
- **Anni storici AE (2018–2021):** la struttura delle pagine potrebbe differire da quella degli anni recenti. Se la pagina annuale non ha la suddivisione per mese o i link PDF hanno un pattern diverso, adattarsi al contenuto trovato anziché aspettarsi un formato fisso
- **Gestione errori:** se una pagina non risponde o un PDF non è raggiungibile, comunicarlo all'utente senza inventare contenuti. Non affermare di aver letto un documento che non è stato effettivamente recuperato
- def.finanze.it restituisce risultati misti (interpelli + circolari + risoluzioni): usa il filtro `tipoEstremi=Interpello` se l'utente vuole solo interpelli
- Non aprire mai PDF in autonomia senza che l'utente abbia scelto il documento: la lista dei titoli è sufficiente per il primo livello di risposta
- Questa skill è estensibile: in futuro potrebbero aggiungersi altre fonti (es. Agenzia delle Dogane, Ministero del Lavoro). Ogni nuova fonte seguirà la stessa struttura: cosa contiene, quando usarla, come navigarla
