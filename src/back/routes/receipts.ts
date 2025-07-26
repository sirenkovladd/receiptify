import type { RouterTypes } from "bun";
import { analyzeReceipt } from "../analyzer";
import type { Models, User } from "../db";

export class ReceiptRoutes {
	private models: Models;
	private getUserFromToken: (session: string) => Promise<User | null>;

	constructor(
		models: Models,
		getUserFromToken: (session: string) => Promise<User | null>,
	) {
		this.models = models;
		this.getUserFromToken = getUserFromToken;
	}

	getRoutes(): Record<string, RouterTypes.RouteValue<string>> {
		const {
			receiptModel,
			receiptItemModel,
			productModel,
			handleNewReceiptUpload,
		} = this.models;

		return {
			"/api/receipts/analyze": {
				POST: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response(JSON.stringify({ message: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response(JSON.stringify({ message: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const formData = await req.formData();
					const file = formData.get("receipt");

					if (!file || typeof file === "string") {
						return new Response(
							JSON.stringify({ message: "Receipt file is required." }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					try {
						const fileBuffer = await file.arrayBuffer();
						const imageBase64 = Buffer.from(fileBuffer).toString("base64");

						const parsedReceipt = await analyzeReceipt(imageBase64, file.type);
						const totalAmount = parsedReceipt.items.reduce(
							(sum, item) => sum + item.price,
							0,
						);

						return new Response(
							JSON.stringify({ ...parsedReceipt, total: totalAmount }),
							{
								headers: { "Content-Type": "application/json" },
							},
						);
					} catch (error) {
						console.error("Error analyzing receipt:", error);
						return new Response(
							JSON.stringify({
								message:
									(error instanceof Error && error.message) ||
									"Failed to analyze receipt.",
							}),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},
			},
			"/api/receipts": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const receipts = await receiptModel.getReceiptsByUserId(user.id);
					return new Response(JSON.stringify(receipts), {
						headers: {
							"Content-Type": "application/json",
						},
					});
				},
				PUT: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}
					const receipt = await req.json();
					try {
						await handleNewReceiptUpload(user.id, receipt);
						return new Response("OK", { status: 200 });
					} catch (err) {
						console.error("Error handling new receipt upload:", err);
						return new Response(
							JSON.stringify({
								message: "Failed to handle new receipt upload.",
							}),
							{ status: 500 },
						);
					}
				},
			},
			"/api/receipts/:id": {
				GET: (async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}
					const receiptId = Number(req.params.id);
					if (!receiptId) {
						return new Response("Invalid receipt ID", { status: 400 });
					}
					const receipt = await receiptModel.getReceiptById(receiptId);
					if (!receipt || receipt.userId !== user.id) {
						return new Response("Receipt not found", { status: 404 });
					}
					const items =
						await receiptItemModel.getDetailedItemsByReceiptId(receiptId);

					return new Response(
						JSON.stringify({
							...receipt,
							items: items.map((item) => ({
								...item,
								name: item.productName,
								quantity: item.quantity,
								unitPrice: item.unitPrice,
							})),
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);
				}) as RouterTypes.RouteHandler<"/receipts/:id">,
				POST: (async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}
					const receiptId = Number(req.params.id);
					if (!receiptId) {
						return new Response("Invalid receipt ID", { status: 400 });
					}
					const data = await req.json();
					try {
						const receipt = await receiptModel.getReceiptById(receiptId);
						if (!receipt || receipt.userId !== user.id) {
							return new Response("Receipt not found", { status: 404 });
						}

						const { items, ...receiptData } = data;
						await receiptModel.updateReceiptById(
							receiptId,
							user.id,
							receiptData,
						);

						if (items && Array.isArray(items)) {
							// @ts-ignore
							await receiptItemModel.deleteItemsByReceiptId(receiptId);
							for (const item of items) {
								const productId = await productModel.findOrCreateProduct({
									name: item.name,
									category: item.category || null,
								});
								await receiptItemModel.createItem({
									...item,
									receiptId,
									productId,
									lineTotal: item.quantity * item.unitPrice,
								});
							}
						}

						const updatedReceipt = await receiptModel.getReceiptById(receiptId);
						const updatedItems =
							await receiptItemModel.getDetailedItemsByReceiptId(receiptId);

						return new Response(
							JSON.stringify({
								...updatedReceipt,
								items: updatedItems.map((item) => ({
									...item,
									name: item.productName,
									quantity: item.quantity,
									unitPrice: item.unitPrice,
								})),
							}),
							{
								status: 200,
								headers: { "Content-Type": "application/json" },
							},
						);
					} catch (err) {
						console.error("Error updating receipt:", err);
						return new Response(
							JSON.stringify({ message: "Failed to update receipt." }),
							{ status: 500 },
						);
					}
				}) as RouterTypes.RouteHandler<"/receipts/:id">,
			},
		};
	}
}
