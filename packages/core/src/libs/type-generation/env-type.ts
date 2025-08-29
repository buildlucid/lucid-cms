import { join, relative } from "node:path";
import type z from "zod/v4";
import constants from "../../constants/constants.js";
import { writeFile } from "node:fs/promises";
import logger from "../logger/index.js";

/**
 * Generates the .lucid/env.d.ts file with the provided schema
 */
const generateEnvTypes = async (props: {
	lucidDir: string;
	schema: z.ZodType | undefined;
	configPath: string;
}) => {
	try {
		const envPath = join(props.lucidDir, constants.typeGeneration.files.env);

		const relativePath = relative(props.lucidDir, props.configPath);

		const envContent = `
${constants.typeGeneration.disclaimer}
${props.schema ? `import type { envSchema } from "${relativePath}";` : ""}
${props.schema ? `import type { z } from "zod/v4";` : ""}

declare global {
	namespace ${constants.typeGeneration.global} {
		${props.schema ? "interface Env extends z.infer<typeof envSchema> {}" : "type Env = Record<string, string>"}
	}
}

${!props.schema ? "export {};" : ""}`;

		await writeFile(envPath, envContent);

		logger.debug({
			message: `Generated ${envPath}`,
			scope: constants.logScopes.typeGeneration,
		});
	} catch (err) {
		logger.error({
			message: `Failed to generate env types: ${err instanceof Error ? err.message : "Unknown error"}`,
			scope: constants.logScopes.typeGeneration,
		});
	}
};

export default generateEnvTypes;
