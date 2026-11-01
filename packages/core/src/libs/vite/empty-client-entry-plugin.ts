import type { Plugin } from "vite";

const entryId = "lucid:empty-client-entry";
const resolvedEntryId = `\0${entryId}`;

/** Emits public files without the admin, using an empty client entry whose chunk is discarded. */
const emptyClientEntryPlugin = (): Plugin => ({
	name: "lucid:empty-client-entry",
	apply: "build",
	applyToEnvironment: (environment) => environment.name === "client",
	configEnvironment(name) {
		if (name !== "client") return;
		return {
			build: { rolldownOptions: { input: { "lucid-client": entryId } } },
		};
	},
	resolveId: {
		filter: { id: new RegExp(`^${RegExp.escape(entryId)}$`) },
		handler: () => resolvedEntryId,
	},
	load: {
		filter: { id: new RegExp(`^${RegExp.escape(resolvedEntryId)}$`) },
		handler: () => "",
	},
	generateBundle(_options, bundle) {
		for (const [fileName, output] of Object.entries(bundle)) {
			if (
				output.type === "chunk" &&
				output.facadeModuleId === resolvedEntryId
			) {
				delete bundle[fileName];
			}
		}
	},
});

export default emptyClientEntryPlugin;
