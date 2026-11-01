# Chiara Galasi Photography

Sito fotografico migrato dal precedente sito statico a Next.js App Router e React.

## Avvio

```bash
corepack pnpm install
corepack pnpm dev
```

Apri http://localhost:3000. Sono disponibili anche gli script `build`, `start` e `lint`.

## Contenuti

- `app/page.tsx`: home con le tre categorie fotografiche.
- `app/*/page.tsx`: pagine del sito con URL senza estensione.
- `app/content/galleries.json`: immagini, descrizioni e dimensioni delle gallerie.
- `app/components`: menu responsive e visualizzatore fotografico accessibile.
- `app/styles`: stili del sito originale; `app/globals.css`: adattamenti React e responsive.
- `public/images` e `public/fonts`: fotografie e font originali.

Le pagine sono prerenderizzate e le immagini sono ottimizzate con `next/image`.
Le FAQ usano gli elementi nativi `details` e `summary`. Le gallerie supportano
frecce da tastiera, Escape e apertura dell'immagine originale. Il sito mantiene
Google Tag Manager, metadati, favicon, robots.txt e sitemap.xml originali.
Gli indirizzi originali `.html` reindirizzano permanentemente alle nuove route
senza estensione; `/index.html` reindirizza alla home `/`.
