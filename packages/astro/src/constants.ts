const constants = {
	integrationName: "@lucidcms/astro",
	toolkitModuleId: "@lucidcms/astro/toolkit",
	generatedDirectory: ".lucid/astro",
	assetDirectory: "public",
	/** Lucid's server endpoints and the admin app, both handled by Lucid. */
	mountPaths: ["/lucid", "/admin"],
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
