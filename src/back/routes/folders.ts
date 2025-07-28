import type { RouterTypes } from "bun";
import type { Models, User } from "../db";

export class FolderRouter {
	// app = new App();
	// constructor() {
	// 	this.app.get("/", this.list);
	// 	this.app.post("/", this.create);
	// 	this.app.delete("/:id", this.delete);
	// }
	private models: Models;
	private getUserFromToken: (session: string) => Promise<User | null>;

	constructor(
		models: Models,
		getUserFromToken: (session: string) => Promise<User | null>,
	) {
		this.models = models;
		this.getUserFromToken = getUserFromToken;
	}

	// async list({ c, db, user }: Ctx) {
	// 	const folders = await db.folderModel.getFoldersByUserId(user.id);
	// 	return c.json(folders);
	// }

	// async create({ c, db, user, body }: Ctx) {
	// 	const { name } = body as { name: string };
	// 	const folderId = await db.folderModel.createFolder(user.id, name);
	// 	return c.json({ id: folderId });
	// }

	// async delete({ c, db, user, params }: Ctx) {
	// 	await db.folderModel.deleteFolder(user.id, Number(params.id));
	// 	return c.json({ success: true });
	// }

	getRoutes(): Record<string, RouterTypes.RouteValue<string>> {
		const { folderModel } = this.models;

		return {
			"/api/folder": {
				GET: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					const folders = await folderModel.getFoldersByUserId(user.id);
					return new Response(JSON.stringify(folders), {
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
					const { name } = body as { name: string };
					const folderId = await folderModel.createFolder(user.id, name);
					return new Response(JSON.stringify({ id: folderId }), {
						headers: { "Content-Type": "application/json" },
					});
				},
			},
			"/api/folder/:id": {
				DELETE: async (req) => {
					const token = req.cookies.get("authUser");
					if (!token) {
						return new Response("Unauthorized", { status: 401 });
					}
					const user = await this.getUserFromToken(token);
					if (!user) {
						return new Response("Unauthorized", { status: 401 });
					}

					await folderModel.deleteFolder(user.id, Number(req.params.id));
					return new Response(JSON.stringify({ success: true }), {
						headers: { "Content-Type": "application/json" },
					});
				},
			},
		};
	}
}
