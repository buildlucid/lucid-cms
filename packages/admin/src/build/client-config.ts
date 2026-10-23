import type { Plugin } from "vite";
import type { AdminClientConfig } from "../types/client-config.js";

const moduleId = "virtual:lucid-admin-config";

export const adminClientConfigPlugin = (config: AdminClientConfig): Plugin => ({
	name: "lucid:admin-client-config",
	resolveId: {
		filter: { id: /^virtual:lucid-admin-config$/ },
		handler: () => `\0${moduleId}`,
	},
	load: {
		filter: { id: /^\0virtual:lucid-admin-config$/ },
		handler: () => `const config = ${JSON.stringify(config)};
Object.freeze(config.brand);
export default Object.freeze(config);`,
	},
});
