import "server-only";
import postgres from "postgres";

// Conexão única por instância serverless. Use a URL "pooled" do Neon.
// Tipos: date -> "YYYY-MM-DD" (string), numeric -> number, timestamptz -> Date.
const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

export const sql: postgres.Sql =
  globalForDb.__sql ??
  postgres((process.env.DATABASE_URL ?? process.env.POSTGRES_URL)!, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
    types: {
      date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
      numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
    },
  });

if (process.env.NODE_ENV !== "production") globalForDb.__sql = sql;

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  sort_order: number;
  active: boolean;
};

export type Appointment = {
  id: string;
  service_id: string | null;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  notes: string;
  starts_at: Date;
  ends_at: Date;
  status: "pendente" | "confirmado" | "concluido" | "cancelado";
  source: "site" | "manual";
  attribution: Record<string, string>;
};
