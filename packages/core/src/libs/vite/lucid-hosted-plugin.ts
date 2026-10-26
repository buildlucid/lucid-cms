import type { Plugin } from "vite";
import constants from "../../constants/constants.js";
import destroyHostedLucids from "../runtime/destroy-hosted-lucids.js";
import type { LucidPluginProps } from "./types.js";

const { moduleId, hostedModuleId } = constants.build;
const resolvedModuleId = `\0${hostedModuleId}`;

/** Provides the runtime's `HostedLucid` through `lucid:hosted` for framework server environments, replacing previous instances on reload and destroying them when the dev server closes. */
const lucidHostedPlugin = (
	props: Pick<LucidPluginProps, "project"> & {
		/** The runtime's hosted module, which exports `createHostedLucid`. */
		module: string;
	},
): Plugin => ({
	name: "lucid:hosted",
	applyToEnvironment: (environment) => environment.config.consumer === "server",
	resolveId: {
		filter: { id: new RegExp(`^${RegExp.escape(hostedModuleId)}$`) },
		handler: () => resolvedModuleId,
	},
	load: {
		filter: { id: new RegExp(`^${RegExp.escape(resolvedModuleId)}$`) },
		handler() {
			const key = {
				configPath: props.project.configPath,
				environment: this.environment.name,
			};

			return `import build from ${JSON.stringify(moduleId)};
import { registerHostedLucid } from "@lucidcms/core/runtime";
import { createHostedLucid } from ${JSON.stringify(props.module)};

export default registerHostedLucid(${JSON.stringify(key)}, createHostedLucid(build));
`;
		},
	},
	closeServer: () => destroyHostedLucids(props.project.configPath),
});

export default lucidHostedPlugin;
