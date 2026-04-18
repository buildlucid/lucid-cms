const lucidMountPath = "/lucid";
const httpGetMethod = "GET";
const httpHeadMethod = "HEAD";

const astroConstants = {
	/**
	 * Public ids Astro and Lucid use to recognise the integration and its
	 * configure wrapper during config loading and code generation.
	 */
	integration: {
		name: "@lucidcms/astro",
		configureLucidModuleId: "@lucidcms/astro/configure-lucid",
		toolkitModuleId: "@lucidcms/astro/toolkit",
		devAssetPluginName: "@lucidcms/astro:assets-dev",
		buildAssetPluginName: "@lucidcms/astro:assets-build",
	},
	/**
	 * Lucid's generated Astro files live under `.lucid/astro`, while prepared
	 * public assets are copied into a Lucid-owned directory before Astro serves
	 * or builds them.
	 */
	paths: {
		mountPath: lucidMountPath,
		workerDir: ".lucid/astro",
		assetDirname: "lucid-public",
		clientDirname: "client",
	},
	files: {
		indexHtml: "index.html",
		emailTemplatesModule: "lucid-email-templates.generated.ts",
		spaHtmlModule: "lucid-spa-html.generated.ts",
		toolkitModule: "lucid-toolkit.generated.ts",
		nodeRoute: "lucid-node.route.ts",
		cloudflareRoute: "lucid-cloudflare.route.ts",
		emailTemplatesJson: "email-templates.json",
		worker: "worker.ts",
		typescriptExtension: ".ts",
	},
	workerArtifacts: {
		exportType: "worker-export",
	},
	http: {
		devOrigin: "http://astro.local",
		defaultBinaryContentType: "application/octet-stream",
		htmlContentType: "text/html; charset=utf-8",
		noStoreCacheControl: "no-store",
		contentTypeHeader: "Content-Type",
		okStatus: 200,
		notFoundStatus: 404,
		getMethod: httpGetMethod,
		headMethod: httpHeadMethod,
		spaShellMethods: [httpGetMethod, httpHeadMethod] as const,
	},
	cloudflare: {
		crossFetchAliasKey: "cross-fetch",
		crossFetchBrowserEntry: "cross-fetch/dist/browser-ponyfill.js",
		runtimeEnvGlobal: "__LUCID_ASTRO_CLOUDFLARE_ENV__",
		devEnvGlobal: "__LUCID_ASTRO_CLOUDFLARE_DEV_ENV__",
		prerenderContextGlobal: "__LUCID_ASTRO_CLOUDFLARE_PRERENDER_CONTEXT__",
	},
	defaults: {
		remoteAddress: "127.0.0.1",
	},
} as const;

export const lucidNonSpaPrefixes = [
	`${astroConstants.paths.mountPath}/api`,
	`${astroConstants.paths.mountPath}/cdn`,
	`${astroConstants.paths.mountPath}/documentation`,
	`${astroConstants.paths.mountPath}/openapi`,
	`${astroConstants.paths.mountPath}/share`,
] as const;

export default astroConstants;
