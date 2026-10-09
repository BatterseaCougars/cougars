import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";

export default [
  { ignores: ["**/dist/", "**/.astro/", "**/.wrangler/", "**/.sanity/", "**/worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...svelte.configs.recommended,
  {
    // TypeScript inside .svelte files and Svelte runes modules (team app, ADR 0022)
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: [".svelte"] } },
  },
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
