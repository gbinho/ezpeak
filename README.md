# Ezpeak (FalaFácil)

App web para brasileiros aprenderem **inglês** e **japonês** com flashcards (FSRS), áudio, avaliação de pronúncia e pronúncia literal escrita do jeito que se fala.

## Stack
- Next.js 15 + Tailwind 4 (PWA)
- Supabase (Auth + Postgres) — projeto `spzdznhqecuazaclibhx`
- Vercel (deploy automático a cada push na `main`)

## Rodar localmente
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Banco de dados
- Esquema: `supabase/migrations/`
- Conteúdo inicial: `supabase/seed.sql` (gerado por `node content/to-sql.mjs`)

## Variáveis de ambiente
| Nome | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (publishable) |
| `ANTHROPIC_API_KEY` | Opcional: ativa tutor, criação de cards e explicações com IA |
