/**
 * This plugin is used to strip the cli block from the adapter. Along with any import that are not needed as a result.
 *
 * As the CLI block is only used in the build/dev process, we can strip it out to reduce the bundle size.
 */
const stripAdapterCLIPlugin = (
	idMatch: string,
	importsToRemove?: string[],
) => ({
	name: "strip-adapter-cli",
	transform(code: string, id: string) {
		if (!id.includes(idMatch)) return null;

		let result = code;

		//* remove cli block
		const cliIndex = result.indexOf("cli:");
		if (cliIndex !== -1) {
			//* look for preceding comma
			let startIndex = cliIndex;
			for (let i = cliIndex - 1; i >= 0; i--) {
				if (/\s/.test(result[i] ?? "")) continue;
				if (result[i] === ",") {
					startIndex = i;
					break;
				}
				break;
			}

			//* find opening brace
			const openBrace = result.indexOf("{", cliIndex);
			if (openBrace !== -1) {
				let braceCount = 0;
				let endIndex = openBrace;
				for (let i = openBrace; i < result.length; i++) {
					if (result[i] === "{") braceCount++;
					if (result[i] === "}") braceCount--;
					if (braceCount === 0) {
						endIndex = i + 1;
						break;
					}
				}
				result = result.slice(0, startIndex) + result.slice(endIndex);
			}
		}

		//* remove specified imports
		if (importsToRemove) {
			for (const importName of importsToRemove) {
				//* remove named imports: import { something } from "package"
				result = result.replace(
					new RegExp(
						`import\\s*\\{[^}]*\\}\\s*from\\s*["']${importName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?\\s*`,
						"g",
					),
					"",
				);

				//* remove default imports: import something from "package"
				result = result.replace(
					new RegExp(
						`import\\s+\\w+\\s+from\\s*["']${importName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?\\s*`,
						"g",
					),
					"",
				);

				//* remove namespace imports: import * as something from "package"
				result = result.replace(
					new RegExp(
						`import\\s*\\*\\s*as\\s+\\w+\\s+from\\s*["']${importName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?\\s*`,
						"g",
					),
					"",
				);
			}
		}

		return result;
	},
});

export default stripAdapterCLIPlugin;
