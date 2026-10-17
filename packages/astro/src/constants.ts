const constants = {
	integrationName: "@lucidcms/astro",
	toolkitModuleId: "@lucidcms/astro/toolkit",
	generatedDirectory: ".lucid/astro",
	assetDirectory: "public",
	/** The admin app, Lucid's server endpoints and its OAuth metadata, all handled by Lucid. */
	mountPaths: [
		"/admin",
		"/api",
		"/mcp",
		"/cdn",
		"/.well-known/oauth-authorization-server",
		"/.well-known/oauth-protected-resource",
	],
	adminDirectory: "admin",
	files: {
		middleware: "middleware.ts",
		route: "route.ts",
		runtime: "runtime.ts",
		emailTemplates: "email-templates.ts",
		translations: "translations.ts",
		spa: "spa.ts",
	},
} as const;

export default constants;
