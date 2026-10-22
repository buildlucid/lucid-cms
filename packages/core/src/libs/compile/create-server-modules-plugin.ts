import path from "node:path";
import { exactRegex, prefixRegex } from "rolldown/filter";
import constants from "../../constants/constants.js";
import type { BundlerPlugin, RuntimeBundleOptions } from "../runtime/types.js";
import isPackageImport from "./is-package-import.js";
import resolveAlias from "./resolve-alias.js";

const { moduleId, entryModulePrefix, dataModulePrefix } = constants.build;
const buildModuleId = `\0${moduleId}`;
const dataImportPattern = new RegExp(
	`(["'])${dataModulePrefix}([^"']+)\\1`,
	"g",
);

/** Returns the import path from a chunk to another file in the build output. */
const relativeImport = (chunkFileName: string, fileName: string) => {
	const relative = path.posix.relative(
		path.posix.dirname(chunkFileName),
		fileName,
	);
	return relative.startsWith(".") ? relative : `./${relative}`;
};

/** Provides virtual runtime entries and `lucid:build`, resolving aliases and build data while keeping external data imports relative to their output chunks. */
const createServerModulesPlugin = (props: {
	entries: Record<string, string>;
	buildModuleSource: string;
	dataDirectory: string;
	bundle: RuntimeBundleOptions;
}): BundlerPlugin => ({
	name: "lucid:server-modules",
	resolveId: {
		filter: {
			id: [
				exactRegex(moduleId),
				prefixRegex(entryModulePrefix),
				prefixRegex(dataModulePrefix),
				...Object.keys(props.bundle.alias ?? {}).map((find) =>
					prefixRegex(find),
				),
			],
		},
		handler(id, importer) {
			if (id === moduleId) return buildModuleId;
			if (id.startsWith(entryModulePrefix)) return id;
			if (id.startsWith(dataModulePrefix)) {
				return props.bundle.buildData === "external"
					? { id, external: true }
					: path.join(props.dataDirectory, id.slice(dataModulePrefix.length));
			}

			// Aliases resolve here so their targets, not the original specifiers, decide what stays external.
			const target = resolveAlias(id, props.bundle.alias);
			if (!target) return;
			if (props.bundle.packages === "external" && isPackageImport(target)) {
				return { id: target, external: true };
			}
			return this.resolve(target, importer, { skipSelf: true });
		},
	},
	load: {
		filter: {
			id: [exactRegex(buildModuleId), prefixRegex(entryModulePrefix)],
		},
		handler(id) {
			if (id === buildModuleId) return props.buildModuleSource;
			return props.entries[id.slice(entryModulePrefix.length)];
		},
	},
	renderChunk: {
		filter: { code: dataModulePrefix },
		handler(code, chunk) {
			// External data files load from the build output, relative to wherever this chunk lands.
			return code.replaceAll(dataImportPattern, (_match, _quote, file) =>
				JSON.stringify(
					relativeImport(
						chunk.fileName,
						`${constants.build.directory}/${file}`,
					),
				),
			);
		},
	},
});

export default createServerModulesPlugin;
