import { randomBytes } from "node:crypto";
import type { RouterTypes } from "bun";
import { encrypt } from "../crypto";
import type { Models, User } from "../db";

export class AuthRoutes {
	private models: Models;
	private tokens: Record<string, [User, number]>;
	private getUserFromToken: (session: string) => Promise<User | null>;

	constructor(
		models: Models,
		tokens: Record<string, [User, number]>,
		getUserFromToken: (session: string) => Promise<User | null>,
	) {
		this.models = models;
		this.tokens = tokens;
		this.getUserFromToken = getUserFromToken;
	}

	getRoutes(): Record<string, RouterTypes.RouteValue<string>> {
		const { userModel, refreshToken } = this.models;
		return {
			"/api/login": {
				POST: async (req) => {
					const { email, password } = (await req.json()) || {};
					if (typeof email === "string" && typeof password === "string") {
						const user = await userModel.getUserByEmailWithPassword(email);
						if (user) {
							if (await Bun.password.verify(password, user.password)) {
								const timestamp = Date.now() / 1000 + 60 * 60 * 24;
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
								this.tokens[token] = [userSession, timestamp];
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
					delete this.tokens[token];
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
					const user = await this.getUserFromToken(token);
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
					const user = await this.getUserFromToken(token);
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
	}
}
