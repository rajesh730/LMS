import mongoose from "mongoose";
import Parent from "@/models/Parent";
import { ensureParentId } from "@/lib/parentIdentity";

/**
 * The Parent ID pre-save hook.
 *
 * This exists because the hook already failed silently once: it used a dynamic
 * `import()` that never resolved at runtime, every save rejected, callers
 * swallowed the error, and the Parent ID column simply stayed blank. Middleware
 * that stops firing is invisible, so it gets a direct test.
 */

describe("ensureParentId", () => {
  it("assigns an ID to a document that has none", async () => {
    const doc = {};
    const Model = { exists: jest.fn().mockResolvedValue(false) };

    const assigned = await ensureParentId(doc, Model);

    expect(assigned).toBe(true);
    expect(doc.parentId).toMatch(/^PRV-P-[A-Z0-9]{6}$/);
  });

  it("leaves an existing ID alone — IDs are never rotated (§6)", async () => {
    const doc = { parentId: "PRV-P-X7K4Q9" };
    const Model = { exists: jest.fn() };

    const assigned = await ensureParentId(doc, Model);

    expect(assigned).toBe(false);
    expect(doc.parentId).toBe("PRV-P-X7K4Q9");
    expect(Model.exists).not.toHaveBeenCalled();
  });

  it("falls back to the document's own model when none is passed", async () => {
    const Model = { exists: jest.fn().mockResolvedValue(false) };
    const doc = { constructor: Model };

    await ensureParentId(doc);

    expect(Model.exists).toHaveBeenCalled();
  });

  it("tolerates a missing document", async () => {
    await expect(ensureParentId(null)).resolves.toBe(false);
  });
});

describe("the hook is actually registered on the Parent schema", () => {
  it("has a pre-save hook", () => {
    // Guards against the hook being removed or renamed. Reaching into Mongoose
    // internals is ugly, but the alternative is discovering the loss in
    // production as an empty column.
    const preHooks = Parent.schema.s.hooks._pres.get("save") || [];
    expect(preHooks.length).toBeGreaterThan(0);
  });

  it("assigns an ID when the hook runs against a real document", async () => {
    // No database: stub the uniqueness probe and drive the hook by hand,
    // exactly as Mongoose would on save().
    const originalExists = Parent.exists;
    Parent.exists = jest.fn().mockResolvedValue(false);

    try {
      const doc = new Parent({ name: "Sita Sharma" });
      expect(doc.parentId).toBeUndefined();

      const preHooks = Parent.schema.s.hooks._pres.get("save");
      const hook = preHooks.find((entry) =>
        entry.fn.name.includes("assignParentId")
      );
      expect(hook).toBeDefined();

      await hook.fn.call(doc);

      expect(doc.parentId).toMatch(/^PRV-P-[A-Z0-9]{6}$/);
    } finally {
      Parent.exists = originalExists;
    }
  });

  it("uses a static import, not a dynamic one", () => {
    // The exact regression that produced a blank column: a dynamic import
    // inside the hook that never resolved in the server bundle.
    const source = require("fs").readFileSync(
      require("path").join(process.cwd(), "models", "Parent.js"),
      "utf8"
    );

    const hookBody = source.slice(source.indexOf('ParentSchema.pre("save"'));
    expect(hookBody).not.toMatch(/await import\(/);
  });
});

afterAll(async () => {
  // Keep Jest from holding the process open on the mongoose singleton.
  await mongoose.connection.close().catch(() => {});
});
