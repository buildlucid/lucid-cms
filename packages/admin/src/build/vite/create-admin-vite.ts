import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { normalizePath, type Plugin, type ResolvedConfig } from "vite";
import solid from "vite-plugin-solid";
import type { AdminConfig } from "../../extensions/types/config.js";
import type { AdminClientConfig } from "../../types/client-config.js";
import { adminClientConfigPlugin } from "../client-config.js";
import { adminDedupe, adminOptimizeDeps, adminRoot } from "../config.js";
import { adminExtensionsPlugin } from "../extensions/plugin.js";
import adminDocumentPlugin, {
	adminEntry,
	adminIconFiles,
} from "./admin-document-plugin.js";
import createAdminModules from "./admin-modules-plugin.js";
import renderAdminDocument from "./render-admin-document.js";
import scopePlugin from "./scope-plugin.js";
import serializeTag from "./serialize-tag.js";

export type AdminViteOptions = {
	/** Absolute path returned by the host's config loader. Extension modules resolve from it. */
	configPath: string;
	admin?: AdminConfig;
	clientConfig: AdminClientConfig;
};

const inClient = (environment: { name: string }) =>
	environment.name === "client";

/** Solid packages share one copy through `resolve.dedupe`, so only the admin's other dependencies resolve from its package. */
const fromAdminPackage = (dependency: string) =>
	dependency.startsWith("solid-js")
		? dependency
		: `@lucidcms/admin > ${dependency}`;

/** The parts of the dev server's config that decide the URLs it serves files at. */
type DevServerUrls = Pick<ResolvedConfig, "root" | "base">;

/** Returns the URL the dev server serves a file at, whether or not it is inside the project root. */
const devUrl = (config: DevServerUrls, file: string) => {
	const relative = path.relative(config.root, file);
	const outsideRoot = relative.startsWith("..") || path.isAbsolute(relative);
	return outsideRoot
		? `${config.base}@fs/${normalizePath(file).replace(/^\//, "")}`
		: `${config.base}${normalizePath(relative)}`;
};

/** Embeds the admin's scoped compiler graph in a host Vite client environment, emitting `admin/index.html` on builds and exposing `renderDevDocument` after plugin `buildStart` hooks finish. */
const createAdminVite = (options: AdminViteOptions) => {
	const modules = createAdminModules();
	const extensions = adminExtensionsPlugin({
		configPath: options.configPath,
		admin: options.admin,
		stylesheetPath: path.join(adminRoot, "src/index.css"),
	});

	const plugins: Plugin[] = [
		modules.plugin,
		{
			name: "lucid:admin-config",
			configEnvironment(name) {
				if (name !== "client") return;
				return {
					resolve: { dedupe: adminDedupe },
					optimizeDeps: {
						include: adminOptimizeDeps.include.map(fromAdminPackage),
						exclude: adminOptimizeDeps.exclude,
					},
					build: {
						rolldownOptions: { input: { "lucid-admin": adminEntry } },
					},
				};
			},
		},
		{
			...adminClientConfigPlugin(options.clientConfig),
			applyToEnvironment: inClient,
		},
		{ ...extensions, applyToEnvironment: inClient },
		adminDocumentPlugin({ tags: extensions.api.tags }),
		// Extension components' stylesheets join the admin's graph, so they can use its theme with `@reference`.
		...tailwindcss().map((plugin) =>
			scopePlugin(plugin, modules.isAdminModule),
		),
		scopePlugin(solid(), modules.isAdminModule),
	];

	return {
		plugins,
		/** Renders the document directly to avoid `transformIndexHtml` caching its entry before the server environment and dependency optimization finish. */
		renderDevDocument: (config: DevServerUrls) =>
			renderAdminDocument({
				icons: {
					ico: devUrl(config, adminIconFiles.ico),
					svg: devUrl(config, adminIconFiles.svg),
					appleTouch: devUrl(config, adminIconFiles.appleTouch),
				},
				head: [
					`<script type="module" src="${config.base}@vite/client"></script>`,
					`<script type="module" src="${devUrl(config, adminEntry)}"></script>`,
					...extensions.api.tags().map(serializeTag),
				].join("\n    "),
			}),
	};
};

export default createAdminVite;
