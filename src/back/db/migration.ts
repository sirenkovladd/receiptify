// --- Database Migrations ---

import type { SQL } from "bun";

// Define SQL statements for database schema creation and updates.
// Each string in this array represents a single migration step.
const migrations = [
	`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE, -- Email should be unique for user accounts
    password VARCHAR(255) NOT NULL,
    photo VARCHAR(255), -- URL or path to user's profile photo
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
	`CREATE TABLE IF NOT EXISTS cards (
		id SERIAL PRIMARY KEY,
		"userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		last4 VARCHAR(4) NOT NULL,
		"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS folders (
		id SERIAL PRIMARY KEY,
		"userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to the user who uploaded the receipt
    type VARCHAR(50) NOT NULL, -- e.g., 'grocery', 'restaurant', 'gas', 'retail'
    "storeName" VARCHAR(255),
    datetime TIMESTAMP NOT NULL,
    "imageUrl" VARCHAR(255), -- URL to the uploaded receipt image
    "totalAmount" DECIMAL(10, 2) NOT NULL, -- Calculated total amount from all items
    description TEXT, -- User-added description for the receipt
    "cardId" INTEGER REFERENCES cards(id) ON DELETE SET NULL,
    "folderId" INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
	`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Product name, unique to avoid duplicates
    category VARCHAR(50), -- e.g., 'Dairy', 'Bakery', 'Electronics'
    "lastPrice" DECIMAL(10, 2), -- Last known price for this product, for historical context
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", name)
  )`,
	`CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    "receiptId" INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE, -- Link to the receipt
    "productId" INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- Link to the product, RESTRICT to prevent deleting product if it's on a receipt
    quantity INTEGER NOT NULL,
    "unitPrice" DECIMAL(10, 2) NOT NULL, -- Price per unit for this specific item on the receipt
    "lineTotal" DECIMAL(10, 2) NOT NULL, -- Total price for this line item (quantity * unitPrice)
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("receiptId", "productId") -- A product can appear only once per receipt
  )`,
	`CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Tags are user-specific
    "parentId" INTEGER REFERENCES tags(id) ON DELETE SET NULL, -- Self-referencing for parent-child relationship
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", name) -- Tag names should be unique per user
  )`,
	`CREATE TABLE IF NOT EXISTS receipt_tags (
    "receiptId" INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    "tagId" INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY ("receiptId", "tagId") -- Composite primary key ensures a tag is applied only once per receipt
  )`,
	`CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "hashedToken" VARCHAR(255) NOT NULL, -- Hashed token for security
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
];

// A unique integer key for our advisory lock.
// This ensures that only one process can run migrations at a time across all connections.
const MIGRATION_ADVISORY_LOCK_KEY = 13371337;

// Function to apply database migrations safely
export let runMigrations = async (client: SQL) => {
	runMigrations = async () => {};
	using sql = await client.reserve();
	// console.log("Attempting to acquire migration lock...");
	// Acquire a session-level advisory lock. This will wait until the lock is available.
	await sql`SELECT pg_advisory_lock(${MIGRATION_ADVISORY_LOCK_KEY})`;
	// console.log("Migration lock acquired.");

	try {
		// Ensure the migrations tracking table exists
		await sql`CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

		// Get the ID of the last applied migration from the tracking table
		const lastAppliedMigrationResult =
			await sql`SELECT id FROM migrations ORDER BY id DESC LIMIT 1`;
		const lastAppliedId =
			lastAppliedMigrationResult.length > 0
				? (lastAppliedMigrationResult[0] as { id: number }).id
				: -1;

		// Iterate through and apply new migrations
		for (let i = lastAppliedId + 1; i < migrations.length; i++) {
			console.log(`Applying migration ${i}...`);
			// Execute the SQL statement for the current migration
			await sql.unsafe(migrations[i] || "select 1");
			// Record the applied migration in the tracking table
			await sql`INSERT INTO migrations (id, name) VALUES (${i}, ${`migration_${i}`})`;
			console.log(`Successfully applied migration ${i}`);
		}
	} catch (error) {
		console.error("A migration failed to apply:", error);
		throw error; // Stop the application if a migration fails
	} finally {
		// Always release the lock, whether migrations succeeded or failed.
		// await sql`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_KEY})`;
		// console.log("Migration lock released.");
	}
};
