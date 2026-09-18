import type { Plugin } from "vite";
import type { AdminClientConfig } from "../types/client-config.js";

const moduleId = "virtual:lucid-admin-config";

export const adminClientConfigPlugin = (config: AdminClientConfig): Plugin => ({
	name: "lucid:admin-client-config",
	resolveId(id) {
		if (id === moduleId) return `\0${id}`;
	},
	load(id) {
		if (id !== `\0${moduleId}`) return;
		return `const config = ${JSON.stringify(config)};
Object.freeze(config.brand);
export default Object.freeze(config);`;
	},
});
