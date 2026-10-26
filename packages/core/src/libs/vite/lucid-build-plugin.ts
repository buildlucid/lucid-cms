import type { Plugin, ResolvedConfig } from "vite";
import constants from "../../constants/constants.js";
import renderBuildModule from "./render-build-module.js";
import type { LucidPluginProps } from "./types.js";

const { moduleId } = constants.build;
const { taskServerPlugin } = constants.dev;
const resolvedModuleId = `\0${moduleId}`;

/** Serves `lucid:build`, the module server entries import the project from, to server environments. */
const lucidBuildPlugin = (
	props: LucidPluginProps & {
		pluginModules: Array<{ key: string; module: string }>;
		renderAdminDocument: (
			config: Pick<ResolvedConfig, "root" | "base">,
		) => string;
		/** The built admin's document, from hosts that build the admin themselves. */
		adminDocument?: () => string | undefined;
	},
): Plugin => ({
	name: "lucid:build",
	applyToEnvironment: (environment) => environment.config.consumer === "server",
	resolveId: {
		filter: { id: new RegExp(`^${RegExp.escape(moduleId)}$`) },
		handler: () => resolvedModuleId,
	},
	load: {
		filter: { id: new RegExp(`^${RegExp.escape(resolvedModuleId)}$`) },
		handler() {
			// A host may start a dev server during its build, such as Astro's, so the environment says which this is.
			const dev = this.environment.mode === "dev";

			// Task servers, including those Lucid's commands start through a host's config, print only runtime errors.
			const taskServer = this.environment
				.getTopLevelConfig()
				.plugins.some((plugin) => plugin.name === taskServerPlugin);

			return renderBuildModule({
				project: props.project,
				host: props.host,
				pluginModules: props.pluginModules,
				adminHtml: dev
					? props.renderAdminDocument(this.environment.config)
					: props.adminDocument?.(),
				dev: dev
					? {
							token: props.token,
							logLevel: taskServer ? "error" : undefined,
							taskServer,
						}
					: undefined,
			});
		},
	},
});

export default lucidBuildPlugin;
