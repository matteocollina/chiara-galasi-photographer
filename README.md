# Chiara Galasi Photography

Portfolio Next.js App Router con pannello `/admin`, database Turso e fotografie su Cloudinary. Il sito pubblico conserva stile, testi, gallerie e redirect del sito originale. Le route non hanno estensione `.html`.

## Avvio

```bash
corepack pnpm install
npm run dev
```

Se la versione locale di Corepack segnala una firma non riconosciuta, aggiorna Corepack oppure usa `npm exec --yes --package=pnpm@10.13.1 -- pnpm install`.

Senza configurazione esterna, il sito mostra il catalogo originale da `app/content/galleries.json` e le foto di `public/images`. `/admin` mostra le variabili mancanti. Non esiste un database in memoria sostitutivo in produzione.

## Configurazione dei servizi gratuiti

1. Crea un database **Turso Free**, possibilmente vicino alla regione Vercel, e genera un token con accesso al database. Usa l’URL `libsql://…` come `STORAGE_TURSO_DATABASE_URL` e il token come `STORAGE_TURSO_AUTH_TOKEN`.
2. Crea un account **Cloudinary Free**. Dalle impostazioni API recupera cloud name, API key e API secret. Non creare preset di upload unsigned: gli upload dell’app sono firmati sul server.
3. Copia `.env.example` in `.env.local` e compila i valori. Genera `ADMIN_SESSION_SECRET` con `node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'`.
4. Esegui i comandi seguenti **prima di pubblicare la nuova configurazione**:

```bash
npm run db:init
npm run portfolio:import
npm run portfolio:verify
```

5. Aggiungi le stesse variabili nelle impostazioni Vercel dell’ambiente desiderato e fai il deploy. Usa database e account separati per preview/test se non vuoi che le modifiche tocchino il portfolio di produzione.

Tutte le variabili sono server-only; nessuna deve avere prefisso `NEXT_PUBLIC_`. I file `.env.local` e `.admin-credentials.local` sono esclusi da Git. Gli script caricano le variabili con le stesse convenzioni di Next.js.

Il database remoto è persistente tra deploy. Il filesystem di Vercel non viene usato per salvare foto o dati; URL `file:` sono rifiutati su Vercel e sono ammessi soltanto nei test/localmente.

### Quote e costi

La configurazione usa solo i piani gratuiti e non contiene operazioni di acquisto, upgrade o attivazione di funzionalità a pagamento. Il costo zero dipende dal rispetto delle quote dei provider; spazio, traffico e trasformazioni Cloudinary condividono i crediti del piano. Controlla periodicamente le dashboard: un superamento può limitare o sospendere il servizio. L’app mostra un errore e consente di riprovare, senza passare automaticamente a piani a pagamento.

- [Turso: piani e quote](https://turso.tech/pricing)
- [Cloudinary: piani e quote](https://cloudinary.com/pricing)

Le immagini vengono distribuite direttamente da Cloudinary con quattro taglie responsive, evitando una seconda elaborazione tramite l’ottimizzatore immagini Vercel.

## Credenziali e sessioni

Le credenziali iniziali sono in **`.admin-credentials.local`**: consegna questo file soltanto al proprietario. Il codice contiene username, sale e hash scrypt della password in `lib/server/admin-credentials.ts`, protetto da `server-only`; la password in chiaro non è nel repository né nel bundle client.

Per cambiare l’account:

```bash
npm run admin:credentials
```

Questo sostituisce le credenziali hardcoded e aggiorna il file locale di consegna. Cambia anche `ADMIN_SESSION_SECRET` e ridistribuisci il sito per invalidare tutte le sessioni precedenti.

Le sessioni scadono dopo 24 ore e sono registrate in Turso. I cookie sono firmati, HttpOnly, SameSite=Lax e Secure in produzione. Il logout revoca la sessione. Le modifiche richiedono sessione valida e Origin corrispondente al sito. Dopo cinque tentativi di login in 15 minuti lo stesso indirizzo viene temporaneamente bloccato; su Vercel si usa l’header IP sovrascritto dalla piattaforma. In locale il limite è condiviso.

`/admin` e le API non sono indicizzabili. Non sono previsti registrazione, recupero password o account aggiuntivi.

## Gestione del portfolio

- Crea categorie con nome per la home, titolo, descrizione e slug. Gli slug sono univoci, immutabili e non possono occupare gli indirizzi delle pagine del sito.
- Carica più fotografie, modifica il testo alternativo, scegli una copertina e riordina categorie e foto con i pulsanti freccia.
- Le categorie vuote non compaiono nella home o nella sitemap. Le modifiche invalidano subito la cache del catalogo; non serve un nuovo deploy.
- Le eliminazioni richiedono conferma. Prima di eliminare una categoria devi svuotarla; gli upload ancora autorizzati ne impediscono temporaneamente la rimozione.

### Upload e pulizia

JPEG, PNG e WebP sono ammessi fino a **20 MB** per file e 80 megapixel. Il browser corregge l’orientamento, ridimensiona a massimo **2400 px** sul lato lungo, appiattisce la trasparenza su bianco e ricodifica in JPEG senza EXIF. Non conserviamo gli originali caricati. Anche Cloudinary applica limiti di dimensione e rimozione profilo alla versione memorizzata.

L’immagine viene inviata direttamente a Cloudinary con una firma server a validità limitata, public ID casuale e overwrite disabilitato. Il server legge i metadati della risorsa direttamente dal provider e verifica formato, dimensioni, peso, dominio e intento di upload prima di pubblicarla nel database. Un retry del salvataggio non duplica la foto.

Ogni autorizzazione di upload riserva anche un’operazione di pulizia. Gli upload non completati diventano eliminabili dopo due ore, oltre la validità della firma; gli upload pubblicati rimuovono la riserva. Le foto eliminate spariscono subito dal sito e vengono cancellate dallo storage; eventuali errori restano in una coda persistente. Il pannello mostra **Riprova pulizia** per le operazioni scadute/fallite. Non c’è un cron a pagamento: la pulizia avviene nelle richieste di eliminazione e tramite il pulsante; riaprendo il pannello puoi vedere gli upload abbandonati da ripulire. Dopo un errore viene applicata una pausa di un minuto prima del nuovo tentativo.

## Importazione del sito precedente

`portfolio:import` importa le tre categorie e tutte le fotografie delle gallerie, preservando ordine, descrizioni e copertine. La copertina Food originale viene inclusa come foto gestibile aggiuntiva, perché nel sito statico non era presente nella relativa galleria.

Gli ID Cloudinary sono deterministici: se il processo si interrompe, ripeterlo recupera le risorse già caricate senza duplicarle. Le foto vengono ottimizzate con Sharp, con orientamento corretto e senza EXIF. Le categorie/foto già registrate non vengono sovrascritte. Esegui l’importazione come migrazione iniziale, non per sincronizzare modifiche successive al pannello.

`portfolio:verify` confronta le risorse remote con i record del database e controlla formato e dimensioni. Non rimuove file. Le foto originali locali restano disponibili fino al completamento di questa verifica; dopo la verifica e il controllo delle pagine pubbliche puoi rimuovere le foto delle gallerie da `public/images`, conservando `chi-sono.jpg` e la favicon. Se rimuovi i file locali, il fallback senza configurazione non sarà più disponibile: mantieni sempre configurate le variabili dei servizi.

Se importi con un sito già online, salva una modifica dall’admin per invalidare la cache, oppure attendi fino a cinque minuti.

## Verifiche

```bash
npm run lint
npm test
npm run build
npm run test:integration
```

I test di integrazione avviano un server di produzione e usano un database SQLite temporaneo con lo stesso driver Turso. Richiedono una build aggiornata e il file locale delle credenziali. Non contattano Cloudinary e non usano i servizi reali. Verificano login/logout, cookie, protezione delle API, origine, limiti ai tentativi, scadenza, categorie, copertine, aggiornamento immediato delle pagine e persistenza dopo un riavvio.

I test del catalogo coprono firme delle sessioni, validazione, transazioni, vincoli, riordino, verifica degli upload, idempotenza e retry delle cancellazioni. I provider esterni sono simulati solo nei test. Prima del rilascio controlla anche un upload reale, il riordino e una cancellazione su Turso/Cloudinary e la resa mobile.

## Struttura

- `app/admin`: interfaccia amministrativa; `app/api/admin`: API protette.
- `lib/server`: autenticazione, catalogo, database, Cloudinary e gestione upload.
- `app/[slug]`: gallerie dinamiche; home, sitemap e metadati usano lo stesso catalogo.
- `scripts`: credenziali, inizializzazione e migrazione verificabile.
- `tests`: controlli su sicurezza, dati e flussi HTTP.
