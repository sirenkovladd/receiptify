import { serve } from "bun";
import index from "./index.html";
import { getModels } from "./src/back/db";
import { DB } from "./src/back/db/client";
import { getRouter } from "./src/back/router";

async function main() {
	const config = {};
	const sql = new DB(config);
	const models = getModels(sql);
	const router = getRouter(models);
	const server = serve({
		routes: {
			...router,
			"/*": index,
		},
		error: (error) => {
			console.error("Error in server:", error);
			return new Response("Internal Server Error", { status: 500 });
		},
		fetch(_req) {
			return new Response("Not Found", { status: 404 });
		},
	});

	console.log(`Listening on http://localhost:${server.port}`);
}	

main().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
