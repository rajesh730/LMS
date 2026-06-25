import bcrypt from "bcryptjs";
import User from "@/models/User";

/**
 * Auto-create the platform super admin when the database has none.
 *
 * This is what makes the admin reappear automatically after you drop/rebuild
 * the database in DEVELOPMENT — no manual bootstrap call needed. It is gated so
 * a known default-credential admin can never be auto-created on a live site.
 *
 *   DEFAULT_ADMIN_EMAIL     - login email for the seeded super admin
 *   DEFAULT_ADMIN_PASSWORD  - login password (stored hashed, never plaintext in DB)
 *   DEFAULT_ADMIN_NAME      - optional display name (defaults to "Super Admin")
 *
 * Safety gates (ALL must pass to seed):
 *   1. NODE_ENV must NOT be "production" (unless ALLOW_ADMIN_SEED_IN_PRODUCTION="true").
 *      -> In production, create the first admin via POST /api/admin/bootstrap instead.
 *   2. Both DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set.
 *   3. No SUPER_ADMIN may already exist (never overwrites a real admin).
 */
export default async function ensureSuperAdmin() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowInProd = process.env.ALLOW_ADMIN_SEED_IN_PRODUCTION === "true";

  const email = String(process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.DEFAULT_ADMIN_PASSWORD || "");
  const name = String(process.env.DEFAULT_ADMIN_NAME || "Super Admin").trim();

  // Gate 1: never auto-seed a known-credential admin on a live deployment.
  if (isProduction && !allowInProd) {
    if (email && password) {
      console.warn(
        "[seed] Skipping auto super-admin seed in production. " +
          "Use POST /api/admin/bootstrap to create the first admin, " +
          "or set ALLOW_ADMIN_SEED_IN_PRODUCTION=true to override (not recommended)."
      );
    }
    return;
  }

  // Gate 2: disabled unless both credentials are provided.
  if (!email || !password) return;

  // Gate 3: never overwrite / duplicate an existing admin.
  const existing = await User.countDocuments({ role: "SUPER_ADMIN" });
  if (existing > 0) return;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "APPROVED",
      isDefaultAdmin: true,
    });
    console.log(`[seed] Created default super admin: ${email}`);
  } catch (err) {
    // Ignore duplicate-key races if two requests tried to seed simultaneously.
    if (err?.code !== 11000) {
      console.error("[seed] Failed to create default super admin:", err.message);
    }
  }
}
