import type { ZodType } from "zod/v4";
import generateEnvTypes from "./env-type.js";
import { ensureLucidDirectoryExists } from "../../utils/helpers/lucid-directory.js";
import { join, relative } from "node:path";
import constants from "../../constants/constants.js";
import type { GenerateTypesResult } from "./types.js";
import { writeFile } from "node:fs/promises";
import { logger } from "../../index.js";

const generateTypes = async (props: {
	envSchema?: ZodType;
	configPath: string;
}) => {
	const lucidDir = await ensureLucidDirectoryExists();

	const typesPath = join(lucidDir, constants.typeGeneration.file);
	const configRelativePath = relative(lucidDir, props.configPath);

	const imports: Array<string> = [];
	const moduleTypes: Record<GenerateTypesResult["module"], string[]> = {
		[constants.typeGeneration.modules.coreTypes]: [],
	};

	const results = await Promise.all([
		generateEnvTypes({
			schema: props.envSchema,
			configRelativePath: configRelativePath,
		}),
	]);

	for (const result of results) {
		if (result.imports) imports.push(result.imports);
		if (result.types) moduleTypes[result.module].push(result.types);
	}

	let typesContent = `${constants.typeGeneration.disclaimer}
${imports.join("\n")}`;

	for (const [module, types] of Object.entries(moduleTypes)) {
		if (types.length === 0) continue;

		typesContent += `
  
declare module '${module}' {
  ${types.map((type) => `\t${type}`).join("\n")}
}`;
	}

	if (imports.length === 0) {
		typesContent += `
export {};
        `;
	}

	await writeFile(typesPath, typesContent);

	logger.debug({
		message: `Generated ${typesPath}`,
		scope: constants.logScopes.typeGeneration,
	});
};

export default generateTypes;
