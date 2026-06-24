import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".wrangler/**",
    "dist/**",
    "drizzle/**",
    "examples/**",
    "work/**",
    "worker/**",
    "drizzle.config.ts",
    "next-env.d.ts",
    "vite.config.ts",
  ]),
]);

export default eslintConfig;
