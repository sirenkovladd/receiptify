import { randomBytes } from "node:crypto";
import type { DB } from "./client";
import "./migration";

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
	cardId?: number | null;
	folderId?: number | null;
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

export interface UserToken {
	id: number;
	userId: number; // The user this token belongs to
	hashedToken: string; // Hashed token for security
}

export interface Card {
	id: number;
	userId: number;
	name: string;
	last4: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Folder {
	id: number;
	userId: number;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

class Model {
	constructor(protected db: DB) {}
}

// --- Data Models and ORM-like Methods ---

export class UserModel extends Model {
	async createUser(
		username: string,
		email: string,
		password: string,
		photo: string | null = null,
	): Promise<number> {
		try {
			const result = await this.db.sql()`
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
				await this.db.sql()`SELECT id, username, email, photo, "createdAt", "updatedAt" FROM users WHERE id = ${id}`;
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
				await this.db.sql()`SELECT id, username, email, photo, "createdAt", "updatedAt" FROM users WHERE email = ${email}`;
			return (result[0] as User) || null;
		} catch (error) {
			console.error("Error getting user by email:", error);
			throw error;
		}
	}

	async getUserByEmailWithPassword(
		email: string,
	): Promise<(User & { password: string }) | null> {
		try {
			// This method is for authentication purposes only
			const result =
				await this.db.sql()`SELECT * FROM users WHERE email = ${email}`;
			return (result[0] as User & { password: string }) || null;
		} catch (error) {
			console.error("Error getting user by email for auth:", error);
			throw error;
		}
	}
}

// New ReceiptModel for interacting with the 'receipts' table
export class ReceiptModel extends Model {
	async createReceipt(
		receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">,
	): Promise<number> {
		try {
			const result = await this.db.sql()`
                INSERT INTO receipts ("userId", type, "storeName", datetime, "imageUrl", "totalAmount", description, "cardId", "folderId")
                VALUES (${receipt.userId}, ${receipt.type}, ${receipt.storeName}, ${receipt.datetime}, ${receipt.imageUrl}, ${receipt.totalAmount}, ${receipt.description}, ${receipt.cardId}, ${receipt.folderId})
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
				await this.db.sql()`SELECT * FROM receipts WHERE id = ${id}`;
			return (result[0] as Receipt) || null;
		} catch (error) {
			console.error("Error getting receipt by ID:", error);
			throw error;
		}
	}

	async getReceiptsByUserId(userId: number): Promise<Receipt[]> {
		try {
			const result =
				await this.db.sql()`SELECT * FROM receipts WHERE "userId" = ${userId} ORDER BY datetime DESC`;
			return result as Receipt[];
		} catch (error) {
			console.error("Error getting receipts by user ID:", error);
			throw error;
		}
	}

	async getStoreNamesByUserId(userId: number): Promise<string[]> {
		try {
			const result = await this.db.sql()`
                SELECT DISTINCT "storeName"
                FROM receipts
                WHERE "userId" = ${userId} AND "storeName" IS NOT NULL
                ORDER BY "storeName" ASC
            `;
			return result.map(
				(row: { storeName: string }) => row.storeName as string,
			);
		} catch (error) {
			console.error("Error getting store names by user ID:", error);
			throw error;
		}
	}

	async updateReceiptById(
		id: number,
		userId: number,
		data: Partial<Omit<Receipt, "id" | "createdAt" | "updatedAt" | "userId">>,
	): Promise<void> {
		try {
			const client = this.db.sql();
			const columns = Object.keys(data) as (keyof typeof data)[];

			if (columns.length === 0) {
				return; // Nothing to update
			}

			// Use the sql helper to dynamically create SET clauses
			// It automatically handles quoting and parameterization
			const result = await client`UPDATE receipts SET ${client(
				data,
				...columns,
			)}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ${id} AND "userId" = ${userId}`;

			if (result.rowCount === 0) {
				// This can happen if the receipt ID doesn't exist or the userId doesn't match.
				console.log(
					`No receipt found with id ${id} for user ${userId} to update.`,
				);
			}
		} catch (error) {
			console.error("Error updating receipt by ID:", error);
			throw error;
		}
	}
}

// New ProductModel for interacting with the 'products' table
export class ProductModel extends Model {
	async findOrCreateProduct(
		product: Omit<Product, "id" | "createdAt" | "updatedAt" | "lastPrice">,
	): Promise<number> {
		try {
			// Get the current client (which could be a transaction client or the main pool)
			const client = this.db.sql();

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
				await this.db.sql()`SELECT * FROM products WHERE id = ${id}`;
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
			await this.db.sql()`UPDATE products SET "lastPrice" = ${price}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ${productId}`;
		} catch (error) {
			console.error("Error updating product last price:", error);
			throw error;
		}
	}
}

// New ReceiptItemModel for interacting with the 'receipt_items' table
export class ReceiptItemModel extends Model {
	async createReceiptItem(
		item: Omit<ReceiptItem, "id" | "createdAt" | "updatedAt">,
	): Promise<number> {
		try {
			const result = await this.db.sql()`
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
				await this.db.sql()`SELECT * FROM receipt_items WHERE "receiptId" = ${receiptId}`;
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
			const result = await this.db.sql()`
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

	async getDetailedItemsByUserId(userId: number): Promise<
		(ReceiptItem & {
			productName: string;
			productCategory: string | null;
			storeName: string | null;
			datetime: Date;
		})[]
	> {
		try {
			const result = await this.db.sql()`
				SELECT
					ri.*,
					p.name AS "productName",
					p.category AS "productCategory",
					r."storeName",
					r.datetime
				FROM receipt_items ri
				JOIN products p ON ri."productId" = p.id
				JOIN receipts r ON ri."receiptId" = r.id
				WHERE r."userId" = ${userId}
				ORDER BY r.datetime DESC
			`;
			return result as (ReceiptItem & {
				productName: string;
				productCategory: string | null;
				storeName: string | null;
				datetime: Date;
			})[];
		} catch (error) {
			console.error("Error getting detailed receipt items by user ID:", error);
			throw error;
		}
	}

	async deleteItemsByReceiptId(receiptId: number): Promise<void> {
		try {
			const client = this.db.sql();
			await client`DELETE FROM receipt_items WHERE "receiptId" = ${receiptId}`;
		} catch (error) {
			console.error("Error deleting receipt items by receipt ID:", error);
			throw error;
		}
	}
}

// New TagModel for interacting with the 'tags' table
export class TagModel extends Model {
	async findOrCreate(
		userId: number,
		name: string,
		parentId: number | null = null,
	): Promise<number> {
		try {
			// Get the current client (which could be a transaction client or the main pool)
			const client = this.db.sql();

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
				await this.db.sql()`SELECT * FROM tags WHERE "userId" = ${userId} ORDER BY name ASC`;
			return result as Tag[];
		} catch (error) {
			console.error("Error getting tags by user ID:", error);
			throw error;
		}
	}

	async getTagById(userId: number, id: number): Promise<Tag | null> {
		try {
			const result =
				await this.db.sql()`SELECT * FROM tags WHERE id = ${id} AND "userId" = ${userId}`;
			return (result[0] as Tag) || null;
		} catch (error) {
			console.error("Error getting tag by ID:", error);
			throw error;
		}
	}

	async deleteTag(userId: number, tagId: number): Promise<void> {
		try {
			await this.db.transaction(async (tx) => {
				const tag =
					await tx`SELECT id FROM tags WHERE id = ${tagId} AND "userId" = ${userId}`;
				if (tag.length === 0) {
					throw new Error(
						"Tag not found or user does not have permission to delete it.",
					);
				}
				await tx`DELETE FROM receipt_tags WHERE "tagId" = ${tagId}`;
				await tx`DELETE FROM tags WHERE id = ${tagId}`;
			});
		} catch (error) {
			console.error(
				`Error deleting tag with ID ${tagId} for user ${userId}:`,
				error,
			);
			throw error;
		}
	}
}

// New ReceiptTagModel for managing the relationship between receipts and tags
export class ReceiptTagModel extends Model {
	async addTagsToReceipt(receiptId: number, tagIds: number[]): Promise<void> {
		if (tagIds.length === 0) {
			return;
		}
		try {
			// "ON CONFLICT DO NOTHING" gracefully handles cases where the tag is already associated
			await this.db.sql()`INSERT INTO receipt_tags ${tagIds.map((tagId) => ({ receiptId, tagId }))} ON CONFLICT DO NOTHING`;
		} catch (error) {
			console.error("Error adding tag to receipt:", error);
			throw error;
		}
	}

	async removeTagFromReceipt(receiptId: number, tagId: number): Promise<void> {
		try {
			await this.db.sql()`DELETE FROM receipt_tags WHERE "receiptId" = ${receiptId} AND "tagId" = ${tagId}`;
		} catch (error) {
			console.error("Error removing tag from receipt:", error);
			throw error;
		}
	}

	async getTagsForReceipt(receiptId: number): Promise<Tag[]> {
		try {
			const result = await this.db.sql()`
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

export class UserTokenModel extends Model {
	async createToken(userId: number, hashedToken: string): Promise<void> {
		try {
			await this.db.sql()`
								INSERT INTO user_tokens ("userId", "hashedToken")
								VALUES (${userId}, ${hashedToken})
								RETURNING id
							`;
		} catch (error) {
			console.error("Error creating user token:", error);
			throw error;
		}
	}

	async getTokenByUserId(userId: number): Promise<UserToken | null> {
		try {
			const result = await this.db.sql()`
								SELECT * FROM user_tokens WHERE "userId" = ${userId}
							`;
			return (result[0] as UserToken) || null;
		} catch (error) {
			console.error("Error getting user token by user ID:", error);
			throw error;
		}
	}

	async deleteTokenByUserId(userId: number): Promise<void> {
		try {
			await this.db.sql()`DELETE FROM user_tokens WHERE "userId" = ${userId}`;
		} catch (error) {
			console.error("Error deleting user token by user ID:", error);
			throw error;
		}
	}
}

export class CardModel extends Model {
	async getCardsByUserId(userId: number): Promise<Card[]> {
		try {
			const result =
				await this.db.sql()`SELECT * FROM cards WHERE "userId" = ${userId} ORDER BY name ASC`;
			return result as Card[];
		} catch (error) {
			console.error("Error getting cards by user ID:", error);
			throw error;
		}
	}

	async createCard(
		userId: number,
		name: string,
		last4: string,
	): Promise<number> {
		try {
			const result = await this.db.sql()`
				INSERT INTO cards ("userId", name, last4)
				VALUES (${userId}, ${name}, ${last4})
				RETURNING id
			`;
			return (result[0] as { id: number }).id;
		} catch (error) {
			console.error("Error creating card:", error);
			throw error;
		}
	}

	async deleteCard(userId: number, cardId: number): Promise<void> {
		try {
			await this.db.sql()`DELETE FROM cards WHERE id = ${cardId} AND "userId" = ${userId}`;
		} catch (error) {
			console.error("Error deleting card:", error);
			throw error;
		}
	}
}

export class FolderModel extends Model {
	async getFoldersByUserId(userId: number): Promise<Folder[]> {
		try {
			const result =
				await this.db.sql()`SELECT * FROM folders WHERE "userId" = ${userId} ORDER BY name ASC`;
			return result as Folder[];
		} catch (error) {
			console.error("Error getting folders by user ID:", error);
			throw error;
		}
	}

	async createFolder(userId: number, name: string): Promise<number> {
		try {
			const result = await this.db.sql()`
				INSERT INTO folders ("userId", name)
				VALUES (${userId}, ${name})
				RETURNING id
			`;
			return (result[0] as { id: number }).id;
		} catch (error) {
			console.error("Error creating folder:", error);
			throw error;
		}
	}

	async deleteFolder(userId: number, folderId: number): Promise<void> {
		try {
			await this.db.sql()`DELETE FROM folders WHERE id = ${folderId} AND "userId" = ${userId}`;
		} catch (error) {
			console.error("Error deleting folder:", error);
			throw error;
		}
	}
}

export function getModels(db: DB) {
	const userModel = new UserModel(db);
	const receiptModel = new ReceiptModel(db);
	const productModel = new ProductModel(db);
	const receiptItemModel = new ReceiptItemModel(db);
	const tagModel = new TagModel(db);
	const receiptTagModel = new ReceiptTagModel(db);
	const userTokenModel = new UserTokenModel(db);
	const cardModel = new CardModel(db);
	const folderModel = new FolderModel(db);

	async function handleNewReceiptUpload(
		userId: number,
		receiptData: ReceiptUpload,
	) {
		try {
			await db.transaction(async () => {
				// All operations within this block will share the same transaction
				const newReceiptId = await receiptModel.createReceipt({
					...receiptData,
					userId: userId,
					datetime: new Date(receiptData.datetime),
				});
				console.log(newReceiptId);

				// Assuming receiptData.items and receiptData.tags exist
				for (const item of receiptData.items) {
					const productId =
						item.id ??
						(await productModel.findOrCreateProduct({
							name: item.name,
							category: item.category ?? null,
						}));
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

	async function refreshToken(userId: number): Promise<string> {
		const token = await db.transaction(async () => {
			const token = await randomBytes(32);
			const hashedToken = await Bun.password.hash(token);
			await userTokenModel.deleteTokenByUserId(userId);
			await userTokenModel.createToken(userId, hashedToken);
			return token.toString("base64url");
		});
		return token;
	}

	return {
		userModel,
		receiptModel,
		productModel,
		receiptItemModel,
		tagModel,
		receiptTagModel,
		userTokenModel,
		cardModel,
		folderModel,
		handleNewReceiptUpload,
		refreshToken,
	};
}

export type Models = ReturnType<typeof getModels>;

export type ReceiptUpload = Omit<
	Receipt,
	"id" | "createdAt" | "updatedAt" | "userId"
> & { id?: number | null } & {
	tags: string[];
	items: ReceiptUploadItem[];
};
export type ReceiptUploadItem = Omit<
	Product,
	"createdAt" | "updatedAt" | "lastPrice" | "id"
> & { id?: number | null } & {
	quantity: number;
	unitPrice: number;
};
