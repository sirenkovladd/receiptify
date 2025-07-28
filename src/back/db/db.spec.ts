// IMPORTANT: This file contains tests for the database logic.
// As the database schema and queries evolve, these tests must be updated.
// Additionally, remember to update QWEN.md with any changes to the database logic or schema.

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { SQL } from "bun";
import { DB } from "./client";
import { getModels, type ReceiptUpload } from "./index";

describe("Database Functions", () => {
	const sql = mock<() => Promise<unknown[]>>(async () => []);
	const db = new DB({});
	spyOn(db, "sql").mockReturnValue(sql as unknown as SQL);
	const {
		refreshToken,
		receiptModel,
		receiptItemModel,
		receiptTagModel,
		tagModel,
		handleNewReceiptUpload,
		productModel,
	} = getModels(db);

	beforeEach(() => {
		// Reset mock calls before each test
		sql.mockClear();
	});

	describe("refreshToken", () => {
		it("should generate a new token for a user and store it hashed", async () => {
			// Mock the database responses for token operations
			sql.mockResolvedValueOnce([]); // deleteTokenByUserId
			sql.mockResolvedValueOnce([{ id: 1 }]); // createToken

			const token = await refreshToken(1);
			expect(token).toBeString();
			expect(token.length).toBeGreaterThan(20);

			// Verify database calls were made
			expect(sql).toHaveBeenCalledTimes(2);

			// Verify the token is properly hashed
			const hashedToken = (sql.mock.calls[1] as string[])[2] || "";
			const isMatch = await Bun.password.verify(
				Buffer.from(token, "base64url"),
				hashedToken,
			);
			expect(isMatch).toBe(true);
		});
	});

	describe("handleNewReceiptUpload", () => {
		it("should correctly upload a new receipt with items and tags in a transaction", async () => {
			// Mock all the database calls that will happen during the upload
			spyOn(receiptModel, "createReceipt").mockResolvedValueOnce(1);
			spyOn(productModel, "findOrCreateProduct").mockResolvedValueOnce(10);
			spyOn(receiptItemModel, "createReceiptItem").mockResolvedValueOnce(1);
			spyOn(productModel, "updateProductLastPrice").mockResolvedValueOnce();
			spyOn(productModel, "findOrCreateProduct").mockResolvedValueOnce(11);
			spyOn(receiptItemModel, "createReceiptItem").mockResolvedValueOnce(2);
			spyOn(productModel, "updateProductLastPrice").mockResolvedValueOnce();
			spyOn(tagModel, "findOrCreate").mockResolvedValueOnce(1);
			spyOn(tagModel, "findOrCreate").mockResolvedValueOnce(2);
			spyOn(receiptTagModel, "addTagsToReceipt").mockResolvedValueOnce();

			const receiptData: ReceiptUpload = {
				type: "grocery",
				storeName: "Test Supermarket",
				datetime: new Date(),
				imageUrl: "http://example.com/receipt.png",
				totalAmount: 7.75,
				description: "Weekly groceries",
				tags: ["groceries", "weekly-test"],
				items: [
					{
						name: "Test Milk",
						category: "Dairy",
						quantity: 2,
						unitPrice: 3.5,
					},
					{
						name: "Test Bread",
						category: "Bakery",
						quantity: 1,
						unitPrice: 0.75,
					},
				],
			};

			expect(handleNewReceiptUpload(1, receiptData)).resolves.toBeUndefined();

			// Verify all database operations were called
			expect(receiptModel.createReceipt).toHaveBeenCalledTimes(1);
			expect(productModel.findOrCreateProduct).toHaveBeenCalledTimes(2);
			expect(receiptItemModel.createReceiptItem).toHaveBeenCalledTimes(2);
			expect(productModel.updateProductLastPrice).toHaveBeenCalledTimes(2);
			expect(tagModel.findOrCreate).toHaveBeenCalledTimes(2);
			expect(receiptTagModel.addTagsToReceipt).toHaveBeenCalledTimes(1);
			expect(receiptTagModel.addTagsToReceipt).toHaveBeenCalledWith(1, [1, 2]);
		});
	});

	describe("Receipt Operations", () => {
		it("should create and retrieve a receipt", async () => {
			// Mock database responses
			sql.mockResolvedValueOnce([{ id: 1 }]); // createReceipt
			sql.mockResolvedValueOnce([
				{
					id: 1,
					userId: 1,
					type: "grocery",
					storeName: "Test Store",
					datetime: new Date(),
					imageUrl: null,
					totalAmount: 100,
					description: "Test receipt",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]); // getReceiptById

			const receiptId = await receiptModel.createReceipt({
				userId: 1,
				type: "grocery",
				storeName: "Test Store",
				datetime: new Date(),
				imageUrl: null,
				totalAmount: 100,
				description: "Test receipt",
			});

			expect(receiptId).toBe(1);

			const receipt = await receiptModel.getReceiptById(1);
			expect(receipt).not.toBeNull();
			expect(receipt?.id).toBe(1);
			expect(receipt?.storeName).toBe("Test Store");
		});

		it("should update a receipt", async () => {
			// Mock database responses
			sql.mockResolvedValueOnce([{ rowCount: 1 }]); // updateReceiptById

			await receiptModel.updateReceiptById(1, 1, {
				storeName: "Updated Store",
				totalAmount: 150,
			});

			expect(sql).toHaveBeenCalled();
		});
	});

	describe("Product Operations", () => {
		it("should find or create a product", async () => {
			// Mock database responses - product already exists
			sql.mockResolvedValueOnce([{ id: 5 }]); // find product (exists)

			const productId = await productModel.findOrCreateProduct(1, {
				name: "Test Product",
				category: "Test Category",
			});

			expect(productId).toBe(5);
			expect(sql).toHaveBeenCalledTimes(1);
		});

		it("should update product last price", async () => {
			// Mock database response
			sql.mockResolvedValueOnce([]);

			await productModel.updateProductLastPrice(1, 25.99);
			expect(sql).toHaveBeenCalled();
		});
	});

	describe("Tag Operations", () => {
		it("should find or create a tag", async () => {
			// Mock database responses - tag already exists
			sql.mockResolvedValueOnce([{ id: 3 }]); // find tag (exists)

			const tagId = await tagModel.findOrCreate(1, "test-tag");
			expect(tagId).toBe(3);
			expect(sql).toHaveBeenCalledTimes(1);
		});

		it("should add tags to receipt", async () => {
			// Mock database response
			sql.mockResolvedValueOnce([]);

			await receiptTagModel.addTagsToReceipt(1, [1, 2]);
			expect(sql).toHaveBeenCalled();
		});
	});
});
