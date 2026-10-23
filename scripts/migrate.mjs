// Aplica as migrações de db/migrations (em ordem) no banco apontado por DATABASE_URL.
// Cada arquivo roda uma única vez (controle na tabela schema_migrations).
//   npm run db:migrate            -> exige DATABASE_URL
//   node scripts/migrate.mjs --build -> usado no build da Vercel: só roda em produção
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";

const isBuild = process.argv.includes("--build");
// URL sem pooler é a indicada para DDL/migrações
const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (isBuild && process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`[migrate] ambiente ${process.env.VERCEL_ENV}: pulando migrações`);
  process.exit(0);
}
if (!url) {
  if (isBuild) {
    console.log("[migrate] DATABASE_URL não definida: pulando migrações");
    process.exit(0);
  }
  console.error("Defina DATABASE_URL (ex.: node --env-file=.env.local scripts/migrate.mjs)");
  process.exit(1);
}

const dir = new URL("../db/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql`create table if not exists schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`;

  // banco criado antes do controle de versões: marca a migração inicial como aplicada
  const [{ legacy }] = await sql`
    select (to_regclass('public.services') is not null
      and not exists (select 1 from schema_migrations)) as legacy`;
  if (legacy) {
    await sql`insert into schema_migrations (name) values ('0001_init.sql') on conflict do nothing`;
  }

  const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  let count = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    console.log(`[migrate] aplicando ${f}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(new URL(f, dir), "utf8"));
      await tx`insert into schema_migrations (name) values (${f})`;
    });
    count++;
  }
  console.log(count ? `[migrate] ${count} migração(ões) aplicada(s)` : "[migrate] banco já está atualizado");
} catch (e) {
  console.error("[migrate] falhou:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
