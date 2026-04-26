import constants from "../../../constants/constants.js";

/**
 * This plugin strips the adapter export and its import from the config file
 */
const stripAdapterExportPlugin = (adapterName: string) => ({
	name: "strip-adapter-export",
	transform(code: string, id: string) {
		if (!id.includes(constants.config.filename)) return null;

		let strippedCode = code;

		// * remove the adapter export
		const adapterExportRegex = /^export\s+(const|let)\s+adapter\s*=/gm;
		const match = adapterExportRegex.exec(strippedCode);

		if (match) {
			const startIndex = match.index;
			let endIndex = startIndex + match[0].length;

			// * find the end by counting braces/parentheses
			let braceCount = 0;
			let parenCount = 0;
			let inString = false;
			let stringChar = "";
			let i = endIndex;

			while (i < strippedCode.length) {
				const char = strippedCode[i];
				const prevChar = strippedCode[i - 1];

				// * handle string literals
				if (
					(char === '"' || char === "'" || char === "`") &&
					prevChar !== "\\"
				) {
					if (!inString) {
						inString = true;
						stringChar = char;
					} else if (char === stringChar) {
						inString = false;
						stringChar = "";
					}
				}

				if (!inString) {
					if (char === "{") braceCount++;
					else if (char === "}") braceCount--;
					else if (char === "(") parenCount++;
					else if (char === ")") parenCount--;

					// * end when we find semicolon at top level
					if (char === ";" && braceCount === 0 && parenCount === 0) {
						endIndex = i + 1;
						break;
					}
				}

				i++;
			}

			// * remove the adapter export
			strippedCode =
				strippedCode.slice(0, startIndex) + strippedCode.slice(endIndex);
		}

		// * remove the adapter function from imports
		strippedCode = strippedCode.replace(
			/import\s*\{\s*([^}]*)\s*\}\s*from\s*["']([^"']+)["']/g,
			(_, imports, source) => {
				// * split imports and filter out the specified adapter (with or without alias)
				const adapterPattern = new RegExp(`^${adapterName}(\\s+as\\s+\\w+)?$`);
				const importList = imports
					.split(",")
					.map((imp: string) => imp.trim())
					.filter((imp: string) => !adapterPattern.test(imp))
					.filter((imp: string) => imp.length > 0);

				// * if no imports left, remove the entire import statement
				if (importList.length === 0) {
					return "";
				}

				// * otherwise, reconstruct the import
				return `import { ${importList.join(", ")} } from "${source}"`;
			},
		);

		return strippedCode;
	},
});

export default stripAdapterExportPlugin;
