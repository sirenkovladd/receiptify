import { serve } from "bun";

const serverRoute = await (async () => {
	if (process.env.NODE_ENV !== "production") {
		return {
			jsFile: async (req) => {
				const bundle = await Bun.build({
					entrypoints: ["./src/front/main.ts"],
					minify: false,
				});
				if (bundle.success && bundle.outputs.length > 0) {
					return new Response(bundle.outputs[0]?.stream(), {
						headers: {
							"Content-Type": "application/javascript",
						},
					});
				}
        console.error(bundle.logs);
        return new Response("Server Error", { status: 500 });
			},
		} satisfies Record<string, Bun.RouterTypes.RouteValue<string>>;
	}
	return {
		jsFile: new Response(await Bun.file("./dist/main.js").bytes(), {
			headers: {
				"Content-Type": "application/javascript",
			},
		}),
	};
})();

serve({
	routes: {
		"/": new Response(await Bun.file("./src/front/index.html").bytes(), {
      headers: {
        "Content-Type": "text/html",
      },
    }),
		"/public/main.js": serverRoute.jsFile,
	},
	fetch(req) {
		return new Response("Not Found", { status: 404 });
	},
});
