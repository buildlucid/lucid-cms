import fs from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import cliLogger from "../logger.js";

const seedTemplate = `import { defineSeed } from "@lucidcms/core/plugin";

export default defineSeed(async (context) => {
	// Add idempotent operations with context.db.query(...) here.
});
`;

/** Creates a project seed file without replacing an existing seed definition. */
const seedNewCommand = async (name: string) => {
	try {
		if (!constants.seeds.nameRegex.test(name) || name.includes(":")) {
			cliLogger.error(
				`Invalid seed name "${name}". Project seed names must only contain lowercase letters, numbers, hyphens and underscores.`,
			);
			process.exit(1);
		}

		const projectRoot = path.dirname(getConfigPath(process.cwd()));
		const directory = path.join(projectRoot, constants.seeds.projectDirectory);
		const filePath = path.join(directory, `${name}.ts`);

		await fs.mkdir(directory, { recursive: true });
		await fs.writeFile(filePath, seedTemplate, { flag: "wx" });

		cliLogger.success(
			"Created seed",
			cliLogger.color.cyan(path.relative(process.cwd(), filePath)),
		);
		process.exit(0);
	} catch (error) {
		cliLogger.error(
			"Failed to create seed",
			error instanceof Error ? error.message : "Unknown error",
		);
		process.exit(1);
	}
};

export default seedNewCommand;
