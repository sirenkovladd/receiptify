import type { RouterTypes } from "bun";
import { randomBytes } from "node:crypto";
import { encrypt } from "./crypto";
import { type User, userModel } from "./db";

const tokens: Record<string, User> = {};

async function getUserFromToken(session: string) {
	return tokens[session];
}

export const router = {
	"/api/receipts/analyze": {
		POST: () => new Response("Hello World"),
	},
	"/api/receipts": {
		GET: () => new Response("Hello World"),
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
