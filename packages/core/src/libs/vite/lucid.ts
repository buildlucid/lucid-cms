import { randomUUID } from "node:crypto";
import path from "node:path";
import { createAdminVite } from "@lucidcms/admin/build";
import type { Plugin, PluginOption } from "vite";
import { LucidError } from "../../utils/errors/index.js";
import createAdminClientConfig from "../admin/create-client-config.js";
import getConfigPath from "../config/get-config-path.js";
import loadPluginClis from "../plugins/load-plugin-clis.js";
import assertNoHost from "./assert-no-host.js";
import loadPluginVite from "./load-plugin-vite.js";
import loadProject from "./load-project.js";
import lucidBuildPlugin from "./lucid-build-plugin.js";
import lucidConfigPlugin from "./lucid-config-plugin.js";
import lucidDevPlugin from "./lucid-dev-plugin.js";
import lucidPreparePlugin from "./lucid-prepare-plugin.js";
import publicAssetsPlugin from "./public-assets-plugin.js";
import type { LucidViteOptions } from "./types.js";

/**
 * Loads config, generates types, builds admin assets, adds plugin Vite integrations and runs runtime migrations, with `lucidcms` owning standalone Vite config and framework `host` integrations such as Astro owning their servers.
 *
 * @example
 * ```ts
 * updateConfig({
 *   vite: { plugins: [lucid({ host: "astro" })] },
 * });
 * ```
 */
const lucid = async (options?: LucidViteOptions): Promise<PluginOption[]> => {
	const configPath = path.resolve(
		options?.configPath ?? getConfigPath(process.cwd()),
	);
	const { project, integration } = await loadProject(configPath, options?.mode);

	// The project declares the host that serves it, so Lucid's commands don't run a hosted project and hosts don't run
	// one that isn't theirs.
	if (!options?.host) {
		await assertNoHost(project.definition.host, project.projectRoot);
	} else if (project.definition.host?.key !== options.host) {
		throw new LucidError({
			message: `lucid({ host: "${options.host}" }) needs lucid.config.* to declare the same host with \`defineConfig({ host })\`.`,
		});
	}

	const clis = await loadPluginClis(project.config, project.projectRoot);
	const pluginVite = await loadPluginVite({ project, clis });

	// Authenticates task requests to the server, from the plugin and Lucid's CLI, for this server instance only.
	const token = randomUUID();

	const admin = createAdminVite({
		configPath,
		admin: project.config.admin,
		clientConfig: createAdminClientConfig(project.config),
	});

	const host = options?.host;
	const props = { project, token, host };
	const ready = Promise.withResolvers<boolean>();

	return [
		lucidConfigPlugin({
			...props,
			ready: ready.promise,
			startMessage: integration.startMessage ?? "Starting the server",
			listen: integration.listen?.(project.adapter),
		}),
		...(options?.prepare === false
			? []
			: [lucidPreparePlugin({ ...props, clis })]),
		lucidDevPlugin({ ...props, onReady: ready.resolve }),
		publicAssetsPlugin(project.resources.files.public),
		lucidBuildPlugin({
			...props,
			pluginModules: pluginVite.flatMap(({ key, module }) =>
				module ? [{ key, module }] : [],
			),
			renderAdminDocument: admin.renderDevDocument,
			adminDocument: options?.adminDocument,
		}),
		// A host's build sets the client's inputs itself, so it builds the admin apart and Lucid only serves it in development.
		...(options?.admin === false
			? []
			: host
				? admin.plugins
						.filter((plugin) => plugin.apply !== "build")
						.map((plugin): Plugin => ({ ...plugin, apply: "serve" }))
				: admin.plugins),
		...pluginVite.flatMap(({ plugins }) => plugins ?? []),
		// Vite awaits and flattens plugin promises, so integrations may set themselves up asynchronously. A host owns the
		// server, so the runtime's server plugins are left out.
		...(host
			? []
			: [
					integration.plugins(project, {
						remote: options?.remote,
						preview: options?.preview,
					}),
				]),
	];
};

export default lucid;
