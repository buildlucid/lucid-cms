import type {
	CloudflareWorkerExport,
	CloudflareWorkerImport,
} from "../types.js";

/**
 * Builds the temporary worker entry file
 */
const buildTempWorkerEntry = (
	importsInput: CloudflareWorkerImport[],
	exportsInput: CloudflareWorkerExport[],
): string => {
	const imports: string[] = [];
	const exports: string[] = [];
	const importTracker = new Map<
		string,
		{
			default?: string;
			exports: Map<string, string | undefined>;
		}
	>();

	for (const imp of importsInput) {
		const existing = importTracker.get(imp.path) || {
			exports: new Map<string, string | undefined>(),
		};

		if (imp.default) {
			// if (existing.default && existing.default !== imp.default) {}
			existing.default = imp.default;
		}

		if (imp.exports) {
			for (const e of imp.exports) {
				if (typeof e === "string") {
					existing.exports.set(e, undefined);
					continue;
				}

				existing.exports.set(e.name, e.as);
			}
		}

		importTracker.set(imp.path, existing);
	}

	for (const exp of exportsInput) {
		const asyncStr = exp.async ? "async " : "";
		const paramsStr = exp.params ? `(${exp.params.join(", ")})` : "()";
		exports.push(`${asyncStr}${exp.name}${paramsStr} { ${exp.content} }`);
	}

	for (const [path, data] of importTracker) {
		const parts: string[] = [];
		if (data.default) {
			parts.push(data.default);
		}
		if (data.exports.size > 0) {
			const namedImports = Array.from(data.exports.entries()).map(
				([name, alias]) => (alias ? `${name} as ${alias}` : name),
			);
			parts.push(`{ ${namedImports.join(", ")} }`);
		}

		if (parts.length > 0) {
			imports.push(`import ${parts.join(", ")} from "${path}";`);
		} else {
			imports.push(`import "${path}";`);
		}
	}

	return `
${imports.join("\n")}

export default {
    ${exports.join(",\n    ")}
};`;
};

export default buildTempWorkerEntry;
