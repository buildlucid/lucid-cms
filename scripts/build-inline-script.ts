import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "rolldown";

/**
 * Bundles a browser script as a minified string-export module. Paths are package-relative;
 * `--check` detects stale output.
 *
 * Usage: node ../../scripts/build-inline-script.ts src/client/form-script.ts src/shared/form-
 * script.ts
 */

const [inputArg, outputArg] = process.argv
	.slice(2)
	.filter((arg) => !arg.startsWith("--"));
const checkMode = process.argv.includes("--check");

const run = async () => {
	if (!inputArg || !outputArg) {
		throw new Error("Usage: build-inline-script.ts <input> <output> [--check]");
	}
	const input = path.resolve(inputArg);
	const outputPath = path.resolve(outputArg);

	const result = await build({
		input,
		write: false,
		output: { format: "iife", minify: true },
	});
	const code = result.output[0].code.trim();
	//* it is written inside a <script> tag
	if (code.includes("</script")) {
		throw new Error(`${inputArg} can't contain '</script'.`);
	}

	const content = `// Built from ${inputArg} by scripts/build-inline-script.ts. Don't edit it here.

const script = ${JSON.stringify(code)};

export default script;
`;

	if (checkMode) {
		const current = await readFile(outputPath, "utf-8").catch(() => null);
		if (current !== content) {
			throw new Error(`${outputArg} is out of date. Run the package's build.`);
		}
		return;
	}
	await writeFile(outputPath, content);
};

run().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
