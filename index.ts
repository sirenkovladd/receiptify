import { serve } from "bun";
import index from './index.html';
import { router } from "./src/back/router";

const server = serve({
	routes: {
		...router,
		"/*": index,
	},
	fetch(req) {
		return new Response("Not Found", { status: 404 });
	},
});

console.log(`Listening on http://localhost:${server.port}`);
