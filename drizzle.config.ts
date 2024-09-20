import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({path: ".dev.vars"});

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_URL as string
  },
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
});