
import { env } from "cloudflare:workers";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "./generated/prisma/client";

export function getPrisma() {
    const adapter = new PrismaD1(env.cloud_db);

    return new PrismaClient({ adapter });
}
