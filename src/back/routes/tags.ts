import type { RouterTypes } from "bun";
import type { Models, User } from "../db";

export class TagRoutes {
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
		const { tagModel, receiptTagModel } = this.models;

		return {
			"/api/tags": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) return new Response("Unauthorized", { status: 401 });

					const user = await this.getUserFromToken(token);
					if (!user) return new Response("Unauthorized", { status: 401 });

					try {
						const tags = await tagModel.getTagsByUserId(user.id);
						return new Response(JSON.stringify(tags), {
							headers: { "Content-Type": "application/json" },
						});
					} catch (error) {
						console.error("Error fetching tags:", error);
						return new Response("Failed to fetch tags", { status: 500 });
					}
				},
				POST: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) return new Response("Unauthorized", { status: 401 });

					const user = await this.getUserFromToken(token);
					if (!user) return new Response("Unauthorized", { status: 401 });

					try {
						const { name, parentId } = await req.json();
						if (!name) {
							return new Response("Tag name is required", { status: 400 });
						}

						const tagId = await tagModel.findOrCreate(user.id, name, parentId);
						const newTag = await tagModel.getTagById(user.id, tagId);

						return new Response(JSON.stringify(newTag), {
							status: 201,
							headers: { "Content-Type": "application/json" },
						});
					} catch (error) {
						console.error("Error creating tag:", error);
						return new Response("Failed to create tag", { status: 500 });
					}
				},
			},
			"/api/tags/:id": {
				DELETE: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) return new Response("Unauthorized", { status: 401 });

					const user = await this.getUserFromToken(token);
					if (!user) return new Response("Unauthorized", { status: 401 });

					try {
						const tagId = Number(req.params.id);
						await tagModel.deleteTag(user.id, tagId);
						return new Response(null, { status: 204 });
					} catch (error) {
						console.error("Error deleting tag:", error);
						return new Response("Failed to delete tag", { status: 500 });
					}
				},
			},
			"/api/receipts/:id/tags": {
				POST: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) return new Response("Unauthorized", { status: 401 });

					const user = await this.getUserFromToken(token);
					if (!user) return new Response("Unauthorized", { status: 401 });

					try {
						const receiptId = Number(req.params.id);
						const { tagId } = await req.json();

						if (!tagId) {
							return new Response("Tag ID is required", { status: 400 });
						}

						await receiptTagModel.addTagsToReceipt(receiptId, [tagId]);
						return new Response("Tag added to receipt", { status: 200 });
					} catch (error) {
						console.error("Error adding tag to receipt:", error);
						return new Response("Failed to add tag to receipt", {
							status: 500,
						});
					}
				},
			},
			"/api/receipts/:receiptId/tags/:tagId": {
				DELETE: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) return new Response("Unauthorized", { status: 401 });

					const user = await this.getUserFromToken(token);
					if (!user) return new Response("Unauthorized", { status: 401 });

					try {
						const receiptId = Number(req.params.receiptId);
						const tagId = Number(req.params.tagId);

						await receiptTagModel.removeTagFromReceipt(receiptId, tagId);
						return new Response("Tag removed from receipt", { status: 200 });
					} catch (error) {
						console.error("Error removing tag from receipt:", error);
						return new Response("Failed to remove tag from receipt", {
							status: 500,
						});
					}
				},
			},
		};
	}
}