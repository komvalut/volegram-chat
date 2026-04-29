import "dotenv/config";
import { db } from "./src/db/index.js";
import { chatUsersTable } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const u = await db.select().from(chatUsersTable).where(eq(chatUsersTable.id, 8));
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}
main();
