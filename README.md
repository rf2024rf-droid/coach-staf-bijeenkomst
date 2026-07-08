# Coach Staf Bijeenkomst

Interactief presentatieplatform voor live vragen, QR-deelname, een apart groot-scherm scherm, een presenter dashboard en een centrale moderatorlogin.

## Stack

- Next.js App Router
- Vercel hosting
- Supabase Postgres
- Server-side database access via `SUPABASE_DATABASE_URL`

## Lokaal starten

1. Maak een Supabase project aan.
2. Open de Supabase SQL editor en voer `supabase/schema.sql` uit.
3. Kopieer `.env.example` naar `.env.local`.
4. Vul `SUPABASE_DATABASE_URL` met de Supabase pooled connection string.
5. Installeer dependencies en start de app:

```bash
npm install
npm run dev
```

De app draait lokaal op `http://localhost:3000`.

## Vercel deployment

Zet in Vercel minimaal deze environment variable:

```bash
SUPABASE_DATABASE_URL=postgresql://...
MODERATOR_PASSWORD=kies-een-eigen-wachtwoord
```

Gebruik bij voorkeur de Supabase pooler connection string met `sslmode=require`.
`MODERATOR_SESSION_SECRET` is optioneel, maar aanbevolen. Gebruik daarvoor een lange willekeurige tekst.

Daarna kan Vercel bouwen met:

```bash
npm run build
```

## Belangrijke routes

- `/` startpunt voor moderatorlogin of sessiecode
- `/moderator` centrale moderatorlogin met alle presentaties
- `/presenter/[id]` presenter dashboard via moderatorlogin
- `/presenter/[id]?key=...` presenter dashboard via losse beheersleutel
- `/join/[code]` deelnemerscherm
- `/screen/[code]` groot-scherm scherm

## Veiligheidsmodel

Dit platform is bedoeld voor simpele, niet-bedrijfsgevoelige sessies.

- Deelnemers komen binnen via QR-code of sessiecode.
- Presentaties aanmaken kan alleen via de centrale moderatorlogin.
- Presenter acties werken via de centrale moderatorlogin of via een willekeurige presenter key.
- Moderator beheer is beschermd met `MODERATOR_PASSWORD`.
- Sla geen gevoelige of vertrouwelijke bedrijfsinformatie op in publieke sessies.
