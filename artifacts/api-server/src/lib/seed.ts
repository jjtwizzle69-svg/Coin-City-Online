import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { hashPassword, newId } from "./auth";
import { ITEMS, TAGS } from "./catalog";
import { logger } from "./logger";

export async function ensureNoah(): Promise<void> {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.usernameLower, "noah"));
  const allItems = ITEMS.map(i => i.id);
  const allTags = TAGS.map(t => t.id);
  if (existing) {
    // Make sure noah always has admin + all items/tags + developer tag equipped
    if (!existing.isAdmin || existing.ownedItems.length < allItems.length || !existing.ownedTags.includes("developer")) {
      await db.update(usersTable)
        .set({
          isAdmin: true,
          ownedItems: allItems,
          ownedTags: allTags,
          equippedTagId: existing.equippedTagId === "noob" ? "developer" : existing.equippedTagId,
        })
        .where(eq(usersTable.id, existing.id));
      logger.info({ userId: existing.id }, "Refreshed noah inventory");
    }
    return;
  }
  const { hash, salt } = hashPassword("gobigorange811");
  await db.insert(usersTable).values({
    id: newId("usr"),
    username: "noah",
    usernameLower: "noah",
    displayName: "Noah",
    passwordHash: hash,
    passwordSalt: salt,
    coins: 1_000_000,
    isAdmin: true,
    ownedItems: allItems,
    ownedTags: allTags,
    equippedTagId: "developer",
  });
  logger.info("Created noah account");
}
