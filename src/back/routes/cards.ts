import type { RouterTypes } from "bun";
import type { Models, User } from "../db";

export class CardRouter {
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
		const { cardModel } = this.models;

		return {
			"/api/card": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const cards = await cardModel.getCardsByUserId(user.id);
					return new Response(JSON.stringify(cards), {
						headers: { "Content-Type": "application/json" },
					});
				},
				POST: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const body = await req.json();
					const { name, last4 } = body as { name: string; last4: string };
					const cardId = await cardModel.createCard(user.id, name, last4);
					return new Response(JSON.stringify({ id: cardId }), {
						headers: { "Content-Type": "application/json" },
					});
				},
			},
			"/api/card/:id": {
				DELETE: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					await cardModel.deleteCard(user.id, Number(req.params.id));
					return new Response(JSON.stringify({ success: true }), {
						headers: { "Content-Type": "application/json" },
					});
				},
			} as RouterTypes.RouteValue<string>,
		};
	}
}
