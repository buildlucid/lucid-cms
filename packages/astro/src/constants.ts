const constants = {
	integrationName: "@lucidcms/astro",
	/** The project's Lucid runtime for Astro, which the integration serves. */
	runtimeModuleId: "virtual:lucid/astro-runtime",
	/** Lucid's route and middleware, which import the runtime module. */
	routeEntrypoint: "@lucidcms/astro/internal/route",
	middlewareEntrypoint: "@lucidcms/astro/internal/middleware",
	/** Where builds put the admin before it joins Astro's output. */
	adminBuildDirectory: ".lucid/astro/admin",
	/** The admin app, Lucid's server endpoints and its OAuth metadata, all handled by Lucid. */
	mountPaths: [
		"/admin",
		"/api",
		"/mcp",
		"/cdn",
		"/.well-known/oauth-authorization-server",
		"/.well-known/oauth-protected-resource",
	],
	/** Lucid's development tasks, such as migrations, which its Vite plugin sends through Astro's server. */
	taskPath: "/__lucid/tasks",
} as const;

export default constants;
