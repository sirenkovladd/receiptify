import type { RouterTypes } from "bun";
import type { Models, User } from "../db";

export class StoreRoutes {
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
		const { receiptModel } = this.models;

		return {
			"/api/stores": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const storeNames = await receiptModel.getStoreNamesByUserId(user.id);
					return new Response(JSON.stringify(storeNames), {
						headers: { "Content-Type": "application/json" },
					});
				},
			},
		};
	}
}
