import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { troveDb?: PrismaClient };
export const db = globalDb.troveDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.troveDb = db;
