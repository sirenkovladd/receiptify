import type { RouterTypes } from "bun";
import { randomBytes } from "node:crypto";
import { analyzeReceipt } from "./analyzer";
import { encrypt } from "./crypto";
import { type User, receiptModel, userModel } from "./db";

const tokens: Record<string, User> = {};

async function getUserFromToken(session: string) {
	return tokens[session];
}

export const router = {
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

			return new Response(
				JSON.stringify({
					items: [
						{
							name: "EASY OFF OVEN",
							count: 1,
							price: 7.99,
						},
						{
							name: "CH ORG TURMERIC",
							count: 1,
							price: 2.79,
						},
						{
							name: "MORNING FRESH",
							count: 1,
							price: 17.99,
						},
						{
							name: "NEK SUN OIL",
							count: 1,
							price: 5.99,
						},
						{
							name: "BOM ELDER HON",
							count: 1,
							price: 6.89,
						},
						{
							name: "PHILA SOFT PLAIN",
							count: 1,
							price: 6.99,
						},
						{
							name: "PC RED RASPBERR",
							count: 1,
							price: 4.99,
						},
						{
							name: "PC WHL STRWBRRS",
							count: 1,
							price: 4.99,
						},
						{
							name: "TOMATO GRAPE",
							count: 1,
							price: 5.99,
						},
						{
							name: "ORANGE NAVEL LG",
							count: 1,
							price: 1.75,
						},
						{
							name: "CARROT",
							count: 1,
							price: 1.27,
						},
						{
							name: "CHKN BNLS SKNLS",
							count: 1,
							price: 15,
						},
						{
							name: "MASTRO GENOA",
							count: 1,
							price: 3.99,
						},
					],
					type: "grocery",
					storeName: "NOFRILLS",
					datetime: "2024-03-24 19:23:05",
					total: 86.61999999999999,
				}),
				{
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

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
		PUT: () => new Response("Hello World"),
	},
	"/api/receipts/:id": {
		GET: () => new Response("Hello World"),
		POST: () => new Response("Hello World"),
		DELETE: () => new Response("Hello World"),
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
						const token = await encrypt(
							`${user.id};${randomBytes(32).toString("base64url")}`,
						);
						const userSession = {
							id: user.id,
							username: user.username,
							email: user.email,
							photo: user.photo,
							createdAt: user.createdAt,
							updatedAt: user.updatedAt,
						};
						tokens[token] = userSession;
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
} satisfies Record<string, RouterTypes.RouteValue<string>>;
