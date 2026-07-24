const mountPath = "/lucid";

const constants = {
	integrationName: "@lucidcms/astro",
	toolkitModuleId: "@lucidcms/astro/toolkit",
	generatedDirectory: ".lucid/astro",
	assetDirectory: "public",
	mountPath,
	files: {
		middleware: "middleware.ts",
		route: "route.ts",
		runtime: "runtime.ts",
		emailTemplates: "email-templates.ts",
		translations: "translations.ts",
		spa: "spa.ts",
		index: "index.html",
	},
	nonSpaPrefixes: [
		`${mountPath}/api`,
		`${mountPath}/cdn`,
		`${mountPath}/documentation`,
		`${mountPath}/openapi`,
	],
} as const;

export default constants;
