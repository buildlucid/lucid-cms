import { writeFile } from "node:fs/promises";
import path from "node:path";

/** Writes a module with relative imports and a default export of plugin module exports by key, so build output can move. */
const writePluginModules = async (
	file: string,
	modules: Record<string, string>,
) => {
	const entries = Object.entries(modules);
	const imports = entries.map(([, modulePath], index) => {
		const relative = path
			.relative(path.dirname(file), modulePath)
			.split(path.sep)
			.join("/");
		return `import * as m${index} from ${JSON.stringify(relative.startsWith(".") ? relative : `./${relative}`)};`;
	});
	const keys = entries.map(
		([key], index) => `\t${JSON.stringify(key)}: m${index},`,
	);
	await writeFile(
		file,
		`${imports.join("\n")}\n\nexport default {\n${keys.join("\n")}\n};\n`,
	);
};

export default writePluginModules;
