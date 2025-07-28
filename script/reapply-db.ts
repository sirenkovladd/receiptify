import { DB } from "../src/back/db/client";
import { runMigrations } from "../src/back/db/migration";

async function reapplyDb() {
	try {
		const db = new DB({});
		console.log("Starting database reset...");

		// 1. Get all table names from the public schema
		const tables = await db.sql()`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;

		if (tables.length > 0) {
			// 2. Drop all tables
			const tableNames = tables
				.map((t) => `"${(t as { tablename: string }).tablename}"`)
				.join(", ");
			console.log(`Dropping tables: ${tableNames}...`);
			await db.sql().unsafe(`DROP TABLE IF EXISTS ${tableNames} CASCADE`);
			console.log("All tables dropped successfully.");
		} else {
			console.log("No tables found to drop.");
		}

		// 3. Re-run migrations
		console.log("Applying migrations...");
		await runMigrations(db.sql());
		console.log("Migrations applied successfully.");

		console.log("Database reset complete!");
	} catch (error) {
		console.error("An error occurred during database reset:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

reapplyDb();
