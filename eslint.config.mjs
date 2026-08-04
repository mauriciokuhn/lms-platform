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
    "next-env.d.ts",
    // Generated e2e artifacts — minified bundles, never linted:
    "playwright-report/**",
    "test-results/**",
  ]),
  // Standalone CJS tooling scripts (run with plain node) legitimately use
  // require() — don't gate them on the ESM-only import rule. k6 load-test
  // scripts also require `export default function ()` — a k6 idiom that the
  // anonymous-default-export rule would otherwise flag.
  {
    files: ["scripts/**/*.js", "*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
