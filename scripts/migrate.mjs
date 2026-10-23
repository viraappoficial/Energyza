// Cria as tabelas no banco (DATABASE_URL). Só roda se o banco ainda estiver vazio.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (ex.: no .env.local: node --env-file=.env.local scripts/migrate.mjs)");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
const [{ exists }] = await sql`select to_regclass('public.services') is not null as exists`;
if (exists) {
  console.log("Banco já tem as tabelas. Nada a fazer.");
} else {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Tabelas criadas e dados iniciais inseridos.");
}
await sql.end();
