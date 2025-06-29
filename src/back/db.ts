import { SQL } from "bun";
import { AsyncLocalStorage } from "node:async_hooks";
import { DB_URL } from "./config";

// --- Interfaces for Data Models ---

export interface User {
	id: number;
	username: string;
	email: string;
	password?: string; // Password should typically not be retrieved directly from DB queries
	photo?: string | null; // URL or path to user's profile photo
	createdAt: Date;
	updatedAt: Date;
}

export interface Receipt {
	id: number;
	userId: number;
	type: string; // e.g., 'grocery', 'restaurant', 'gas', 'retail'
	storeName: string | null; // The name of the store or vendor
	datetime: Date; // Date and time of the receipt
	imageUrl: string | null; // URL to the uploaded receipt image
	totalAmount: number; // Calculated total amount from all items on the receipt
	description: string | null; // User-added description for the receipt
	createdAt: Date;
	updatedAt: Date;
}

export interface Product {
	id: number;
	name: string;
	category: string | null; // e.g., 'Dairy', 'Bakery', 'Electronics'
	lastPrice: number | null; // Last known price for this product
	createdAt: Date;
	updatedAt: Date;
}

export interface ReceiptItem {
	id: number;
	receiptId: number;
	productId: number;
	quantity: number; // Quantity of the product on this specific receipt
	unitPrice: number; // Price per unit of the product on this specific receipt
	lineTotal: number; // Total price for this line item (quantity * unitPrice)
	createdAt: Date;
	updatedAt: Date;
}

export interface Tag {
	id: number;
	name: string;
	userId: number; // Tags are user-specific
	parentId: number | null; // For hierarchical tags
	createdAt: Date;
	updatedAt: Date;
}

// --- Database Migrations ---

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
	`CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to the user who uploaded the receipt
    type VARCHAR(50) NOT NULL, -- e.g., 'grocery', 'restaurant', 'gas', 'retail'
    "storeName" VARCHAR(255),
    datetime TIMESTAMP NOT NULL,
    "imageUrl" VARCHAR(255), -- URL to the uploaded receipt image
    "totalAmount" DECIMAL(10, 2) NOT NULL, -- Calculated total amount from all items
    description TEXT, -- User-added description for the receipt
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
	`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE, -- Product name, unique to avoid duplicates
    category VARCHAR(50), -- e.g., 'Dairy', 'Bakery', 'Electronics'
    "lastPrice" DECIMAL(10, 2), -- Last known price for this product, for historical context
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
];

// A unique integer key for our advisory lock.
// This ensures that only one process can run migrations at a time across all connections.
const MIGRATION_ADVISORY_LOCK_KEY = 13371337;

// Function to apply database migrations safely
let runMigrations =  async (sql: SQL) => {
	runMigrations = async () => {};
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
			await sql.unsafe(migrations[i] || 'select 1');
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
}

// --- Database Connection Setup ---

const _db = new SQL({
	// Optional configuration
	url: DB_URL,
	// Callbacks
	onconnect: async (client) => {
		await runMigrations(client || await _db.connect()); // Run migrations when a new connection is established
	},
});

// AsyncLocalStorage to hold the current transaction client
// If no transaction is active, it will be undefined, and we'll fall back to the main pool.
const transactionLocalStorage = new AsyncLocalStorage<SQL>();

// Helper function to get the current SQL client.
// It prioritizes the client stored in AsyncLocalStorage (i.e., a transaction client)
// and falls back to the main connection pool if no transaction is active.
function getDbClient(): SQL {
	const currentClient = transactionLocalStorage.getStore();
	return currentClient || _db;
}

// Function to run operations within a transaction.
// This is the primary way to start and manage transactions.
export async function withTransaction<T>(
	callback: () => Promise<T>,
): Promise<T> {
	return _db.begin(async (tx) => {
		return transactionLocalStorage.run(tx, callback);
	});
}

// --- Data Models and ORM-like Methods ---

export class UserModel {
	async createUser(
		username: string,
		email: string,
		password: string,
		photo: string | null = null,
	): Promise<number> {
		try {
			const result = await getDbClient()`
                INSERT INTO users (username, email, password, photo)
                VALUES (${username}, ${email}, ${password}, ${photo})
                RETURNING id
            `;
			return (result[0] as { id: number }).id;
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	}

	async getUserById(id: number): Promise<User | null> {
		try {
			// Exclude password from the returned user object for security
			const result =
				await getDbClient()`SELECT id, username, email, photo, "createdAt", "updatedAt" FROM users WHERE id = ${id}`;
			return (result[0] as User) || null;
		} catch (error) {
			console.error("Error getting user by ID:", error);
			throw error;
		}
	}

	async getUserByEmail(email: string): Promise<User | null> {
		try {
			// Exclude password from the returned user object for security
			const result =
				await getDbClient()`SELECT id, username, email, photo, "createdAt", "updatedAt" FROM users WHERE email = ${email}`;
			return (result[0] as User) || null;
		} catch (error) {
			console.error("Error getting user by email:", error);
			throw error;
		}
	}

	async getUserByEmailWithPassword(email: string): Promise<(User & { password: string}) | null> {
		try {
			// This method is for authentication purposes only
			const result =
				await getDbClient()`SELECT * FROM users WHERE email = ${email}`;
			return (result[0] as User & { password: string}) || null;
		} catch (error) {
			console.error("Error getting user by email for auth:", error);
			throw error;
		}
	}
}

// New ReceiptModel for interacting with the 'receipts' table
export class ReceiptModel {
	async createReceipt(
		receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">,
	): Promise<number> {
		try {
			const result = await getDbClient()`
                INSERT INTO receipts ("userId", type, "storeName", datetime, "imageUrl", "totalAmount", description)
                VALUES (${receipt.userId}, ${receipt.type}, ${receipt.storeName}, ${receipt.datetime}, ${receipt.imageUrl}, ${receipt.totalAmount}, ${receipt.description})
                RETURNING id
            `;
			return (result[0] as { id: number }).id;
		} catch (error) {
			console.error("Error creating receipt:", error);
			throw error;
		}
	}

	async getReceiptById(id: number): Promise<Receipt | null> {
		try {
			const result =
				await getDbClient()`SELECT * FROM receipts WHERE id = ${id}`;
			return (result[0] as Receipt) || null;
		} catch (error) {
			console.error("Error getting receipt by ID:", error);
			throw error;
		}
	}

	async getReceiptsByUserId(userId: number): Promise<Receipt[]> {
		try {
			const result =
				await getDbClient()`SELECT * FROM receipts WHERE "userId" = ${userId} ORDER BY datetime DESC`;
			return result as Receipt[];
		} catch (error) {
			console.error("Error getting receipts by user ID:", error);
			throw error;
		}
	}

	async getStoreNamesByUserId(userId: number): Promise<string[]> {
		try {
			const result = await getDbClient()`
                SELECT DISTINCT "storeName"
                FROM receipts
                WHERE "userId" = ${userId} AND "storeName" IS NOT NULL
                ORDER BY "storeName" ASC
            `;
			return result.map((row: { storeName: string }) => row.storeName as string);
		} catch (error) {
			console.error("Error getting store names by user ID:", error);
			throw error;
		}
	}
}

// New ProductModel for interacting with the 'products' table
export class ProductModel {
	async findOrCreateProduct(
		product: Omit<Product, "id" | "createdAt" | "updatedAt" | "lastPrice">,
	): Promise<number> {
		try {
			// Get the current client (which could be a transaction client or the main pool)
			const client = getDbClient();

			const existingProduct =
				await client`SELECT id FROM products WHERE name = ${product.name}`;
			if (existingProduct.length > 0) {
				return (existingProduct[0] as { id: number }).id;
			}

			const newProduct = await client`
                INSERT INTO products (name, category)
                VALUES (${product.name}, ${product.category})
                RETURNING id
            `;
			return (newProduct[0] as { id: number }).id;
		} catch (error) {
			console.error("Error in findOrCreateProduct:", error);
			throw error;
		}
	}

	async getProductById(id: number): Promise<Product | null> {
		try {
			const result =
				await getDbClient()`SELECT * FROM products WHERE id = ${id}`;
			return (result[0] as Product) || null;
		} catch (error) {
			console.error("Error getting product by ID:", error);
			throw error;
		}
	}

	async updateProductLastPrice(
		productId: number,
		price: number,
	): Promise<void> {
		try {
			await getDbClient()`UPDATE products SET "lastPrice" = ${price}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ${productId}`;
		} catch (error) {
			console.error("Error updating product last price:", error);
			throw error;
		}
	}
}

// New ReceiptItemModel for interacting with the 'receipt_items' table
export class ReceiptItemModel {
	async createReceiptItem(
		item: Omit<ReceiptItem, "id" | "createdAt" | "updatedAt">,
	): Promise<number> {
		try {
			const result = await getDbClient()`
                INSERT INTO receipt_items ("receiptId", "productId", quantity, "unitPrice", "lineTotal")
                VALUES (${item.receiptId}, ${item.productId}, ${item.quantity}, ${item.unitPrice}, ${item.lineTotal})
                RETURNING id
            `;
			return (result[0] as { id: number }).id;
		} catch (error) {
			console.error("Error creating receipt item:", error);
			throw error;
		}
	}

	async getItemsByReceiptId(receiptId: number): Promise<ReceiptItem[]> {
		try {
			const result =
				await getDbClient()`SELECT * FROM receipt_items WHERE "receiptId" = ${receiptId}`;
			return result as ReceiptItem[];
		} catch (error) {
			console.error("Error getting receipt items by receipt ID:", error);
			throw error;
		}
	}

	// Method to get receipt items with joined product details for a more complete view
	async getDetailedItemsByReceiptId(
		receiptId: number,
	): Promise<
		(ReceiptItem & { productName: string; productCategory: string | null })[]
	> {
		try {
			const result = await getDbClient()`
                SELECT
                    ri.*,
                    p.name AS "productName",
                    p.category AS "productCategory"
                FROM receipt_items ri
                JOIN products p ON ri."productId" = p.id
                WHERE ri."receiptId" = ${receiptId}
                ORDER BY ri.id ASC
            `;
			return result as (ReceiptItem & {
				productName: string;
				productCategory: string | null;
			})[];
		} catch (error) {
			console.error("Error getting detailed receipt items:", error);
			throw error;
		}
	}
}

// New TagModel for interacting with the 'tags' table
export class TagModel {
	async findOrCreate(
		userId: number,
		name: string,
		parentId: number | null = null,
	): Promise<number> {
		try {
			// Get the current client (which could be a transaction client or the main pool)
			const client = getDbClient();

			const existingTag =
				await client`SELECT id FROM tags WHERE "userId" = ${userId} AND name = ${name}`;
			if (existingTag.length > 0) {
				return (existingTag[0] as { id: number }).id;
			}

			const newTag = await client`
                INSERT INTO tags ("userId", name, "parentId")
                VALUES (${userId}, ${name}, ${parentId})
                RETURNING id
            `;
			return (newTag[0] as { id: number }).id;
		} catch (error) {
			console.error("Error in findOrCreateTag:", error);
			throw error;
		}
	}

	async getTagsByUserId(userId: number): Promise<Tag[]> {
		try {
			const result =
				await getDbClient()`SELECT * FROM tags WHERE "userId" = ${userId} ORDER BY name ASC`;
			return result as Tag[];
		} catch (error) {
			console.error("Error getting tags by user ID:", error);
			throw error;
		}
	}
}

// New ReceiptTagModel for managing the relationship between receipts and tags
export class ReceiptTagModel {
	async addTagsToReceipt(receiptId: number, tagIds: number[]): Promise<void> {
		try {
			// "ON CONFLICT DO NOTHING" gracefully handles cases where the tag is already associated
			await getDbClient()`INSERT INTO receipt_tags ${tagIds.map((tagId) => ({ receiptId, tagId }))} ON CONFLICT DO NOTHING`;
		} catch (error) {
			console.error("Error adding tag to receipt:", error);
			throw error;
		}
	}

	async removeTagFromReceipt(receiptId: number, tagId: number): Promise<void> {
		try {
			await getDbClient()`DELETE FROM receipt_tags WHERE "receiptId" = ${receiptId} AND "tagId" = ${tagId}`;
		} catch (error) {
			console.error("Error removing tag from receipt:", error);
			throw error;
		}
	}

	async getTagsForReceipt(receiptId: number): Promise<Tag[]> {
		try {
			const result = await getDbClient()`
                SELECT t.* FROM tags t
                JOIN receipt_tags rt ON t.id = rt."tagId"
                WHERE rt."receiptId" = ${receiptId}
                ORDER BY t.name ASC
            `;
			return result as Tag[];
		} catch (error) {
			console.error("Error getting tags for receipt:", error);
			throw error;
		}
	}
}

// Export instances of the models for easy access throughout your application
export const userModel = new UserModel();
export const receiptModel = new ReceiptModel();
export const productModel = new ProductModel();
export const receiptItemModel = new ReceiptItemModel();
export const tagModel = new TagModel();
export const receiptTagModel = new ReceiptTagModel();

type ReceiptUpload = Omit<Receipt, "id" | "createdAt" | "updatedAt"> & {
	tags: string[];
};
type ReceiptUploadItem = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
	quantity: number;
	unitPrice: number;
};

export async function handleNewReceiptUpload(
	userId: number,
	receiptData: ReceiptUpload,
	items: ReceiptUploadItem[],
) {
	try {
		await withTransaction(async () => {
			// All operations within this block will share the same transaction
			const newReceiptId = await receiptModel.createReceipt({
				userId: userId,
				type: receiptData.type,
				storeName: receiptData.storeName,
				datetime: new Date(receiptData.datetime),
				imageUrl: receiptData.imageUrl,
				totalAmount: receiptData.totalAmount,
				description: receiptData.description,
			});

			// Assuming receiptData.items and receiptData.tags exist
			for (const item of items) {
				const productId = await productModel.findOrCreateProduct({
					name: item.name,
					category: item.category,
				});
				await receiptItemModel.createReceiptItem({
					receiptId: newReceiptId,
					productId: productId,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					lineTotal: item.quantity * item.unitPrice,
				});
				await productModel.updateProductLastPrice(productId, item.unitPrice);
			}

			const tagIds = await Promise.all(
				receiptData.tags.map(async (tagName) => {
					return await tagModel.findOrCreate(userId, tagName);
				}),
			);

			await receiptTagModel.addTagsToReceipt(newReceiptId, tagIds);

			console.log(
				`Receipt ${newReceiptId} and its items/tags saved successfully within a transaction.`,
			);
		});
	} catch (error) {
		console.error("Failed to process receipt transaction:", error);
		// The transaction would have been rolled back automatically
		throw new Error("Failed to save receipt data.");
	}
}
