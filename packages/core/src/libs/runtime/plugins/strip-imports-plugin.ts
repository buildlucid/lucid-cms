/**
 * This plugin is used to strip any import that are not needed.
 */
const stripImportsPlugin = (idMatch: string, importsToRemove?: string[]) => ({
	name: "strip-adapter-cli",
	transform(code: string, id: string) {
		if (!id.includes(idMatch)) return null;

		let result = code;

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

export default stripImportsPlugin;
