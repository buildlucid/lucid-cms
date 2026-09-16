import type { Jiti } from "jiti";
import type z from "zod";
import { LucidError } from "../../utils/errors/index.js";
import loadConfigModule from "../config/utils/load-config-module.js";
import type { ResourceFile, ResourceModules } from "./types.js";

/** Loads default exports in file order, validating their shape and unique registration keys. */
const loadModules = async <T>(props: {
	loader: Jiti;
	kind: keyof ResourceModules;
	files: ResourceFile[];
	schema: z.ZodType<T>;
	key?: (value: T) => string;
	explicit?: readonly T[];
}) => {
	const { loader, kind, files, schema, key, explicit = [] } = props;
	const values: T[] = [];
	const moduleFiles: string[] = [];
	const dependencies = new Set<string>();
	const origins = new Map<string, string>();

	if (key) {
		for (const value of explicit) {
			origins.set(key(value), `explicit ${kind} registration`);
		}
	}

	for (const file of files) {
		const loaded = await loadConfigModule<unknown>({
			loader,
			specifier: file.path,
			dependencyEntryPath: file.path,
		}).catch((cause: unknown) => {
			throw new LucidError({
				message: `Invalid ${kind} module in "${file.path}": ${cause instanceof Error ? cause.message : String(cause)}`,
				cause,
			});
		});

		dependencies.add(file.path);

		for (const dependency of loaded.dependencies) {
			dependencies.add(dependency);
		}

		const module = loaded.module;
		if (
			typeof module !== "object" ||
			module === null ||
			!("default" in module)
		) {
			continue;
		}

		const parsed = schema.safeParse(module.default);
		if (!parsed.success)
			throw new LucidError({
				message: `Invalid ${kind} default export in "${file.path}": ${parsed.error.message}`,
			});

		if (key) {
			const name = key(parsed.data);
			const previous = origins.get(name);
			if (previous) {
				throw new LucidError({
					message: `Duplicate ${kind} resource "${name}" in "${previous}" and "${file.path}".`,
				});
			}

			origins.set(name, file.path);
		}

		values.push(parsed.data);
		moduleFiles.push(file.path);
	}

	return { values, files: moduleFiles, dependencies: [...dependencies] };
};

export default loadModules;
