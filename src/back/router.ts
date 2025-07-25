import type { RouterTypes } from "bun";
import { randomBytes } from "node:crypto";
import { analyzeReceipt } from "./analyzer";
import { decrypt, encrypt } from "./crypto";
import type { Models, User } from "./db";

const tokens: Record<string, [User, number]> = {};

export function getRouter(models: Models) {
	const {
		receiptModel,
		receiptItemModel,
		receiptTagModel,
		tagModel,
		userModel,
		userTokenModel,
		refreshToken,
		productModel,
		handleNewReceiptUpload,
	} = models;
	async function getUserFromToken(session: string) {
		if (tokens[session]) {
			return tokens[session][0];
		}
		try {
			const decrypted = await decrypt(session);
			const [id, _token, timestamp] = decrypted.split(";");
			if (!timestamp) {
				return null;
			}
			if (+timestamp < Date.now() / 1000) {
				return null;
			}
			const user = await userModel.getUserById(Number(id));
			if (user) {
				tokens[session] = [user, +timestamp];
				return user;
			}
			return null;
		} catch (_err) {
			return null;
		}
	}

	const router: Record<string, RouterTypes.RouteValue<string>> = {
		"/api/receipts/analyze": {
			POST: async (req) => {
				const token = req.cookies.get("authUser");
				if (!token) {
					return new Response(JSON.stringify({ message: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}
				const user = await getUserFromToken(token);
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
				} catch (error: any) {
					console.error("Error analyzing receipt:", error);
					return new Response(
						JSON.stringify({
							message: error.message || "Failed to analyze receipt.",
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
				const user = await getUserFromToken(token);
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
				const user = await getUserFromToken(token);
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
						JSON.stringify({ message: "Failed to handle new receipt upload." }),
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
				const user = await getUserFromToken(token);
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
				const user = await getUserFromToken(token);
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
					await receiptModel.updateReceiptById(receiptId, user.id, receiptData);

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
		"/api/receipts/:id/tags": {
			POST: () => new Response("Hello World"),
		},
		"/api/receipts/:receiptId/:productId": {
			POST: () => new Response("Hello World"),
			DELETE: () => new Response("Hello World"),
		},
		"/api/tags": {
			GET: () => new Response("Hello World"),
		},
		"/api/tags/:id": {
			DELETE: () => new Response("Hello World"),
		},
		"/api/stores": {
			GET: async (req) => {
				const token = req.cookies.get("authUser");
				if (!token) {
					return new Response("Unauthorized", { status: 401 });
				}
				const user = await getUserFromToken(token);
				if (!user) {
					return new Response("Unauthorized", { status: 401 });
				}

				const storeNames = await receiptModel.getStoreNamesByUserId(user.id);
				return new Response(JSON.stringify(storeNames), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
		"/api/login": {
			POST: async (req) => {
				const { email, password } = (await req.json()) || {};
				if (typeof email === "string" && typeof password === "string") {
					const user = await userModel.getUserByEmailWithPassword(email);
					if (user) {
						if (await Bun.password.verify(password, user.password)) {
							const timestamp = new Date().getTime() / 1000 + 60 * 60 * 24;
							const token = await encrypt(
								`${user.id};${randomBytes(32).toString("base64url")};${timestamp}`,
							);
							const userSession = {
								id: user.id,
								username: user.username,
								email: user.email,
								photo: user.photo,
								createdAt: user.createdAt,
								updatedAt: user.updatedAt,
							};
							tokens[token] = [userSession, timestamp];
							req.cookies.set("authUser", token, {
								httpOnly: true,
								sameSite: "lax",
							});
							return new Response(JSON.stringify(userSession), {
								status: 200,
								headers: {
									"Content-Type": "application/json",
								},
							});
						}
						return new Response("Invalid credentials", {
							status: 401,
						});
					}
					return new Response("User not found", {
						status: 404,
					});
				}
				return new Response("Invalid request body", {
					status: 400,
				});
			},
		},
		"/api/logout": {
			POST: async (req) => {
				const token = req.cookies.get("authUser");
				if (!token) {
					return new Response("Unauthorized", { status: 401 });
				}
				delete tokens[token];
				req.cookies.delete("authUser");
				return new Response("Logged out", {
					status: 200,
				});
			},
		},
		"/api/me": {
			GET: async (req) => {
				const token = req.cookies.get("authUser");
				if (!token) {
					return new Response("Unauthorized", { status: 401 });
				}
				const user = await getUserFromToken(token);
				if (!user) {
					return new Response("Unauthorized", { status: 401 });
				}
				return new Response(JSON.stringify(user), {
					headers: {
						"Content-Type": "application/json",
					},
				});
			},
		},
		"/api/token/refresh": {
			POST: async (req) => {
				const token = req.cookies.get("authUser");
				if (!token) {
					return new Response("Unauthorized", { status: 401 });
				}
				const user = await getUserFromToken(token);
				if (!user) {
					return new Response("Unauthorized", { status: 401 });
				}
				const userToken = await refreshToken(user.id);
				return new Response(JSON.stringify({ token: userToken }), {
					headers: {
						"Content-Type": "application/json",
					},
				});
			},
		},
	};
	return router;
}
