import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * Architecture enforcement.
 *
 * The layering in `docs/ARCHITECTURE.md` is only real if something checks it.
 * These rules make the dependency rule mechanical instead of aspirational.
 *
 * Deliberately staged as "warn", not "error": the existing deviations are
 * counted in ARCHITECTURE.md §7 and are being retired in batches. Flip each
 * rule to "error" once its count reaches zero, so it can never regress.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // --- Dependency rule: arrows point down --------------------------------
  // Domain (lib/) and Persistence (models/) must never import from Delivery
  // (app/). This one is already at ZERO violations after authOptions moved to
  // lib/authOptions.js, so it is an error and must stay that way.
  {
    files: ["lib/**/*.js", "models/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "../app/*", "**/app/api/*"],
              message:
                "Dependency rule violation: lib/ and models/ are below app/ and must not import from it. Move the shared value into lib/ and have the route import it (see docs/ARCHITECTURE.md §2).",
            },
          ],
        },
      ],
    },
  },

  // --- Server/client split inside the domain layer -----------------------
  // lib/client/** is browser code (React hooks, subscriptions). It must never
  // pull a server module into the bundle — that is how a Mongoose model or a
  // secret ends up shipped to the browser.
  {
    files: ["lib/client/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/models/*", "@/lib/db", "@/lib/emailService", "@/lib/authOptions"],
              message:
                "lib/client/** is browser code and must not import server modules (models, db, mail, auth config). Fetch through an API route instead.",
            },
          ],
        },
      ],
    },
  },

  // --- Delivery layer conventions ----------------------------------------
  // Every route gates through requireApiSession(). This reached ZERO on
  // 2026-08-18 (all 118 call sites converted), so it is an error now: the
  // 401-vs-403 decision must stay in one place.
  {
    files: ["app/api/**/route.js"],
    // The NextAuth handler is the one legitimate importer of authOptions.
    // Note: its path contains `[...nextauth]`, which a glob reads as a
    // character class, so it must be excluded by directory, not by filename.
    ignores: ["app/api/auth/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next-auth",
              importNames: ["getServerSession"],
              message:
                "Use requireApiSession() from @/lib/authz instead of calling getServerSession directly, so 401 vs 403 is decided in one place (ARCHITECTURE.md §3).",
            },
            {
              name: "next-auth/next",
              importNames: ["getServerSession"],
              message:
                "Use requireApiSession() from @/lib/authz instead of calling getServerSession directly (ARCHITECTURE.md §3).",
            },
          ],
          patterns: [
            {
              group: ["@/lib/authOptions"],
              message:
                "Routes should not read the NextAuth config directly — go through requireApiSession() from @/lib/authz. Only the NextAuth handler itself imports authOptions.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
