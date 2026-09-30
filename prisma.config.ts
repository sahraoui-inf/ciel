import { defineConfig } from "prisma/config";
import { PrismaClient } from "@prisma/client";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "mysql://root@localhost:3306/portailciel",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
