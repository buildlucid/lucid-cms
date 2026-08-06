import fs from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import cliLogger from "../logger.js";

const migrationTemplate = `import { defineMigration } from "@lucidcms/core/plugin";

export default defineMigration({
	async up(context) {
		// await context.db.kysely.schema
		// 	.createTable("example")
		// 	.addColumn("id", context.config.db.getDataType("primary"), (col) =>
		// 		context.config.db.primaryKeyColumnBuilder(col),
		// 	)
		// 	.execute();
	},
	async down(context) {
		// await context.db.kysely.schema.dropTable("example").execute();
	},
});
`;

const migrateNewCommand = async (name: string) => {
	try {
		if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
			cliLogger.error(
				`Invalid migration name "${name}". Migration names must only contain lowercase letters, numbers, hyphens and underscores.`,
			);
			process.exit(1);
		}

		const projectRoot = path.dirname(getConfigPath(process.cwd()));
		const directory = path.join(
			projectRoot,
			constants.db.externalMigrationDirectory,
		);
		const fileName = `${Date.now()}-${name}.ts`;
		const filePath = path.join(directory, fileName);

		await fs.mkdir(directory, { recursive: true });
		await fs.writeFile(filePath, migrationTemplate, { flag: "wx" });

		cliLogger.success(
			"Created migration",
			cliLogger.color.cyan(path.relative(process.cwd(), filePath)),
		);
		process.exit(0);
	} catch (error) {
		cliLogger.error(
			"Failed to create migration",
			error instanceof Error ? error.message : "Unknown error",
		);
		process.exit(1);
	}
};

export default migrateNewCommand;
