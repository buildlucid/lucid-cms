import path from "node:path";
import type z from "zod";
import { LucidError } from "../../utils/errors/index.js";

/** Validates imported resources such as seeds or external migrations and inline definitions into unique values keyed by name, using file stems as names and skipping modules without default exports. */
const collectResourceModules = <Value>(props: {
	/** The resource's name in messages, such as `seed`. */
	label: string;
	/** The helper that creates a value, named when a file's default export isn't one. */
	helper: string;
	schema: z.ZodType<Value>;
	/** Throws for a name the resource doesn't accept. */
	validateName: (name: string, origin: string) => void;
	modules: Array<{ path: string; module: { default?: unknown } }>;
	definitions: Array<{ name: string; value: Value }>;
}): Record<string, Value> => {
	const values: Record<string, Value> = {};
	const origins: Record<string, string> = {};

	const add = (name: string, value: Value, origin: string) => {
		if (origins[name]) {
			throw new LucidError({
				message: `Duplicate ${props.label} name "${name}". Names must be unique across all ${props.label} sources.`,
				data: { origins: [origins[name], origin] },
			});
		}

		values[name] = value;
		origins[name] = origin;
	};

	for (const { path: filePath, module } of props.modules) {
		if (!("default" in module)) continue;

		const fileName = path.basename(filePath);
		const name = fileName.slice(
			0,
			fileName.length - path.extname(fileName).length,
		);
		props.validateName(name, filePath);

		const parsed = props.schema.safeParse(module.default);
		if (!parsed.success) {
			throw new LucidError({
				message: `Invalid ${props.label} file "${fileName}". It must default export a ${props.label} created with the "${props.helper}" helper.`,
				data: { filePath },
			});
		}

		add(name, parsed.data, filePath);
	}

	for (const definition of props.definitions) {
		const origin = `inline source "${definition.name}"`;
		props.validateName(definition.name, origin);
		add(definition.name, definition.value, origin);
	}

	return values;
};

export default collectResourceModules;
