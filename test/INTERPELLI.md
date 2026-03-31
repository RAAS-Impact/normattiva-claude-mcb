# Suite di test manuali — Skill Interpelli

Da eseguire su Claude Desktop dopo aver installato il pacchetto `.mcpb` e la skill `.skill` (`diritto-italiano`).
Per ogni scenario: inviare la query a Claude e verificare che il comportamento corrisponda a quello atteso.

---

## T01 — Attivazione automatica della skill

**Query:** `Cosa dice l'Agenzia delle Entrate sui lavoratori impatriati?`

**Comportamento atteso:**
- Claude attiva la skill `diritto-italiano` e segue le istruzioni di `interpelli.md` (senza che l'utente la invochi esplicitamente)
- Non segue le istruzioni di `normattiva.md` né usa i tool MCP Normattiva
- Naviga def.finanze.it con i termini "lavoratori impatriati" e filtro Interpello
- Presenta una lista di risultati con numero, data, ente, oggetto
- NON apre nessun PDF prima che l'utente scelga

**Verifica routing:** def.finanze.it (ricerca per argomento)

---

## T02 — Ricerca per numero specifico (Fonte A)

**Query:** `Trovami l'interpello n. 82 del 2026`

**Comportamento atteso:**
- Claude naviga `agenziaentrate.gov.it/portale/interpelli-2026`
- Legge gli href dei mesi con `javascript_tool` (non li costruisce a mano)
- Identifica Marzo 2026 (n. 58–82) e naviga quell'URL
- Legge la lista del mese e trova la voce n. 82
- Presenta il titolo e chiede se l'utente vuole leggere il documento

**Verifica routing:** Fonte A (numero specifico)

---

## T03 — Consegna URL e analisi PDF dopo scelta utente (Fonte A)

**Prerequisito:** T02 completato, Claude ha trovato il n. 82/2026

**Query:** `Sì, leggilo`

**Comportamento atteso:**
- Claude recupera l'URL del PDF già annotato nel Passo 2 (senza rinavigare al PDF)
- Mostra in chat il messaggio standard con titolo del documento e URL scaricabile
- Istruisce l'utente a scaricare il PDF e allegarlo alla chat
- Attende l'allegato senza tentare screenshot, `WebFetch`, `get_page_text` o altre alternative autonome
- Quando l'utente allega il PDF, produce una sintesi: quesito, soluzione prospettata, parere AdE
- Cita: tipo documento, numero, data, ente, link diretto al PDF

**Verifica:** sintesi accurata, nessuna allucinazione sul contenuto

---

## T04 — Ricerca per argomento con tipo documento (Fonte B)

**Query:** `Ci sono circolari dell'INPS sulla contribuzione delle società sportive?`

**Comportamento atteso:**
- Claude naviga `callRicAvanzataPrassi.do`
- Usa il form `executeAdvancedPrassiSearch` con: `parole=società sportive`, `tipoEstremi=Circolare`, `ente=INPS`
- Presenta lista risultati con numero, data, oggetto
- NON apre PDF in autonomia

**Verifica routing:** Fonte B (ente non-AdE + tipo non-interpello)

---

## T05 — Ricerca per argomento senza ente specificato (Fonte B)

**Query:** `Qual è la posizione del fisco italiano sulle cripto-attività?`

**Comportamento atteso:**
- Claude naviga def.finanze.it con `parole=cripto`
- Riporta risultati misti (interpelli AdE, circolari) senza filtrare per ente
- Presenta una lista ordinata per data con almeno 5-10 risultati
- Chiede all'utente quale documento approfondire

**Verifica:** lista include sia interpelli che circolari, ordinati per data decrescente

---

## T06 — Consegna URL e analisi PDF da def.finanze.it (Fonte B)

**Prerequisito:** T05 completato, l'utente sceglie un interpello dalla lista

**Query:** `Apri il secondo della lista`

**Comportamento atteso:**
- Claude naviga `getPrassiDetail.do?id={GUID}`
- Usa `javascript_tool` con `document.querySelector('a[href*="getContent.do"]').href` per ottenere l'URL del PDF
- Mostra in chat il messaggio standard con titolo e URL scaricabile
- Istruisce l'utente a scaricare il PDF e allegarlo alla chat
- Attende l'allegato senza tentare alternative autonome
- Quando l'utente allega il PDF, sintetizza il contenuto con citazione completa

**Verifica:** Claude non tenta di aprire il PDF autonomamente; la sintesi è prodotta solo dopo che l'utente ha allegato il file

---

## T07 — Browsing recente (Fonte A)

**Query:** `Quali interpelli ha pubblicato l'AdE questo mese?`

**Comportamento atteso:**
- Claude naviga la pagina del mese corrente su agenziaentrate.gov.it
- Riporta la lista completa degli interpelli del mese con numero, data e oggetto
- Non apre PDF

**Verifica routing:** Fonte A (browsing recente)

---

## T08 — Routing corretto verso normattiva.md

**Query:** `Cerca il decreto legislativo 209 del 2023 su normattiva`

**Comportamento atteso:**
- Claude attiva la skill `diritto-italiano` e segue le istruzioni di `normattiva.md`
- Usa i tool MCP Normattiva (ricercaAvanzata o simili)
- Non naviga agenziaentrate.gov.it né def.finanze.it

**Verifica:** il routing della skill indirizza correttamente verso `normattiva.md` per richieste su atti legislativi

---

## T09 — Gestione risultati nulli

**Query:** `Ci sono interpelli AdE sulla tassa sul sole del 2024?`

**Comportamento atteso:**
- Claude esegue la ricerca su def.finanze.it
- Non trova risultati (o trova risultati non pertinenti)
- Comunica chiaramente l'assenza di risultati senza inventare documenti
- Suggerisce eventualmente termini di ricerca alternativi

**Verifica:** nessuna allucinazione di documenti inesistenti

---

## T10 — Argomento + anno specifico (Fonte B)

**Query:** `Mostrami gli interpelli del 2024 sulle plusvalenze da immobili`

**Comportamento atteso:**
- Claude usa la ricerca avanzata di def.finanze.it con `parole=plusvalenze immobili`, `tipoEstremi=Interpello`, anno 2024
- Presenta lista filtrata per quell'anno
- Identifica correttamente il campo anno nel form

**Verifica routing:** Fonte B con filtro anno

---

---

## T11 — Anni storici AE (struttura potenzialmente diversa)

**Query:** `Trovami l'interpello n. 15 del 2019`

**Comportamento atteso:**
- Claude tenta prima `agenziaentrate.gov.it/portale/interpelli-2019`
- Se 404, tenta il percorso alternativo: `/portale/normativa-e-prassi/risposte-agli-interpelli/interpelli/archivio-interpelli/interpelli-2019`
- Se anche questo restituisce 404, comunica il problema senza inventare risultati
- In caso di successo, legge gli href dei mesi dalla pagina annuale con `javascript_tool` (non li costruisce a mano: il pattern è inconsistente tra anni storici e recenti)
- Trova la voce n. 15 e propone il documento con URL cliccabile

---

## T12 — URL PDF non recuperabile dalla pagina

**Prerequisito:** Claude ha trovato un interpello e l'utente ha chiesto di leggerlo

**Simulazione:** la pagina mensile AE o la pagina di dettaglio def.finanze non contiene link PDF (es. documento rimosso o struttura anomala)

**Comportamento atteso:**
- `javascript_tool` non trova alcun `href` PDF valido
- Claude comunica chiaramente che non è riuscito a recuperare il link al documento
- Suggerisce all'utente di cercare il documento manualmente sul sito dell'ente
- Non inventa URL né contenuti del documento

---

## T13 — Pagina mensile AE senza risultati o 404

**Query:** `Mostrami gli interpelli di agosto 2018`

**Comportamento atteso:**
- Claude legge gli href dalla pagina annuale 2018
- Se il mese non è presente nella lista (es. nessun interpello pubblicato quel mese), lo comunica
- Se la pagina mensile restituisce 404, prova la variante singolare/plurale dell'URL e se fallisce comunica il problema
- Non inventa interpelli inesistenti

---

## T14 — Ricerca def.finanze.it senza risultati

**Query:** `Ci sono interpelli AdE sulla tassa sul macinato del 2025?`

**Comportamento atteso:**
- Claude esegue la ricerca su def.finanze.it
- La ricerca restituisce 0 risultati
- Claude lo comunica chiaramente: "Non ho trovato interpelli su questo argomento"
- Suggerisce eventualmente termini alternativi o la possibilità che il documento esista ma non sia indicizzato

---

## T15 — Documento lungo (allegato in chat o nel progetto)

**Prerequisito:** T03 o T06 completato; il PDF è disponibile tramite allegato in chat oppure già presente nei file del progetto

**Contesto:** interpello di 15–20 pagine

**Comportamento atteso:**
- Claude legge il PDF dal contesto disponibile (chat o progetto) senza chiedere di allegarlo di nuovo se già presente
- Produce una sintesi completa: quesito, soluzione prospettata, parere AdE (inclusa la risposta conclusiva)
- Se il contenuto è molto lungo, struttura la sintesi in sezioni chiare
- Non afferma di aver letto sezioni che non ha effettivamente elaborato

---

## T16 — Paginazione risultati def.finanze.it (Fonte B)

**Query:** `Mostrami tutti gli interpelli AdE sull'IVA del 2024`

**Comportamento atteso:**
- Claude esegue la ricerca su def.finanze.it con `parole=IVA`, `tipoEstremi=Interpello`, `ente=Agenzia delle Entrate`, anno 2024
- La ricerca restituisce molti risultati su più pagine
- Claude presenta la prima pagina di risultati con numero, data, oggetto
- Indica che ci sono ulteriori risultati (es. "Ci sono altri risultati, vuoi che continui?")
- NON naviga automaticamente alle pagine successive senza che l'utente lo chieda

**Verifica:** Claude riconosce che i risultati sono paginati e lo comunica all'utente

---

## T17 — Navigazione alla pagina successiva (Fonte B)

**Prerequisito:** T16 completato, Claude ha mostrato la prima pagina di risultati

**Query:** `Sì, mostrami la pagina successiva`

**Comportamento atteso:**
- Claude naviga alla seconda pagina dei risultati su def.finanze.it
- Presenta i nuovi risultati nello stesso formato della prima pagina
- Se ci sono altre pagine ancora, lo segnala
- Non ripete i risultati già mostrati nella prima pagina

**Verifica:** i risultati della seconda pagina sono diversi da quelli della prima

---

## T18 — Paginazione mesi AE con molti interpelli (Fonte A)

**Query:** `Mostrami tutti gli interpelli di gennaio 2025`

**Comportamento atteso:**
- Claude naviga la pagina annuale 2025 su agenziaentrate.gov.it
- Identifica il mese di gennaio e naviga quell'href
- Se la pagina mensile contiene molti interpelli, li presenta tutti (o in blocchi gestibili)
- Se la pagina AE stessa è paginata o suddivisa, naviga le sotto-pagine per completare la lista
- Indica il numero totale di interpelli trovati per quel mese

**Verifica:** la lista è completa rispetto a quanto pubblicato sulla pagina AE

---

## T19 — Richiesta esplicita di tutti i risultati (Fonte B)

**Query:** `Elencami TUTTI gli interpelli AdE del 2024 sul superbonus, anche se sono su più pagine`

**Comportamento atteso:**
- Claude esegue la ricerca su def.finanze.it
- Naviga tutte le pagine di risultati fino all'ultima
- Presenta una lista consolidata e completa
- Indica il numero totale di documenti trovati

**Verifica:** Claude scorre effettivamente tutte le pagine e non si ferma alla prima

---

## Checklist di validazione generale

Per ogni test verificare:

- [ ] La skill `diritto-italiano` si attiva e il routing sceglie il file corretto (`interpelli.md` vs `normattiva.md`)
- [ ] Claude non costruisce URL mensili AE a mano ma li legge dalla pagina
- [ ] Claude non apre PDF prima della scelta dell'utente
- [ ] Il selettore PDF usa `a[href*="pdf"]` sull'intero documento (non dentro `main`)
- [ ] Claude non tenta mai di aprire o scaricare PDF autonomamente (no `WebFetch`, no screenshot, no `get_page_text` sul PDF)
- [ ] Claude mostra sempre il messaggio standard con titolo, URL cliccabile e istruzioni per entrambe le opzioni (chat / progetto)
- [ ] La sintesi è prodotta solo dopo che il PDF è disponibile (allegato in chat o già nei file del progetto)
- [ ] Se il PDF è già nei file del progetto, Claude non chiede di allegarlo nuovamente
- [ ] La risposta finale cita sempre: tipo, numero, data, ente, link
- [ ] Nessuna allucinazione di documenti o contenuti non allegati
- [ ] Quando i risultati sono paginati, Claude lo segnala e chiede prima di proseguire (salvo richiesta esplicita di "tutti")
