import type { RouterTypes } from "bun";
import type { Models, User } from "../db";

export class ProductRoutes {
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
		const { receiptItemModel } = this.models;

		return {
			"/api/products": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					try {
						const products = await receiptItemModel.getDetailedItemsByUserId(
							user.id,
						);
						return new Response(JSON.stringify(products), {
							headers: {
								"Content-Type": "application/json",
							},
						});
					} catch (error) {
						console.error("Error fetching products:", error);
						return new Response(
							JSON.stringify({ message: "Failed to fetch products." }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},
			},
		};
	}
}
