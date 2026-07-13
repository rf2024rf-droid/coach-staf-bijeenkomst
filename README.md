# Sessie Interactief

Interactief presentatieplatform voor live vragen, QR-deelname, een apart groot-scherm scherm, een presenter dashboard, gebruikersaccounts en een aparte beheerderlogin.

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
SUPABASE_URL=https://jouw-project.supabase.co
SUPABASE_ANON_KEY=...
POSTGRES_POOL_SIZE=1
POSTGRES_IDLE_TIMEOUT=5
PUBLIC_SESSION_CACHE_MS=1000
MODERATOR_PASSWORD=kies-een-eigen-wachtwoord
```

Gebruik bij voorkeur de Supabase pooler connection string met `sslmode=require`.
Laat `POSTGRES_POOL_SIZE` op `1` staan bij Vercel/Supabase. De app draait serverless en meerdere Vercel-instances kunnen anders samen te veel databaseverbindingen openen.
`MODERATOR_SESSION_SECRET` en `ACCOUNT_SESSION_SECRET` zijn optioneel, maar aanbevolen. Gebruik daarvoor lange willekeurige teksten.

Voor definitief verwijderen van gebruikers uit Supabase Auth is deze extra geheime sleutel nodig:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
```

Zonder `SUPABASE_SERVICE_ROLE_KEY` verwijdert de app accounts wel lokaal en blokkeert opnieuw inloggen, maar het Auth-account blijft dan technisch in Supabase bestaan.

Daarna kan Vercel bouwen met:

```bash
npm run build
```

## Belangrijke routes

- `/` startpunt voor gebruikerslogin, beheerderlogin of sessiecode
- `/moderator` gebruikerslogin met eigen presentaties
- `/beheerder` aparte beheerderlogin met accountoverzicht
- `/presenter/[id]` presenter dashboard via gebruikers- of beheerderlogin
- `/presenter/[id]?key=...` presenter dashboard via losse beheersleutel
- `/join/[code]` deelnemerscherm
- `/screen/[code]` groot-scherm scherm

## Veiligheidsmodel

Dit platform is bedoeld voor simpele, niet-bedrijfsgevoelige sessies.

- Deelnemers komen binnen via QR-code of sessiecode.
- Presentaties aanmaken kan alleen via een gebruikersaccount of beheerderlogin.
- Presenter acties werken via de gebruikers-/beheerderlogin of via een willekeurige presenter key.
- Beheerdertoegang is beschermd met `MODERATOR_PASSWORD`.
- Sla geen gevoelige of vertrouwelijke bedrijfsinformatie op in publieke sessies.
