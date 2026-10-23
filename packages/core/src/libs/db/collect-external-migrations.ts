import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import { migrationSchema } from "../config/definition-schemas.js";
import collectResourceModules from "../resources/collect-resource-modules.js";
import type { ExternalMigration, MigrationDefinition } from "./types.js";

//* a fixed width timestamp keeps lexicographic order in line with creation order
const validateMigrationName = (name: string, origin: string) => {
	if (!constants.db.externalMigrationNameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid migration name "${name}". Migration names must start with a 13 digit timestamp followed by lowercase letters, numbers, hyphens and underscores, eg. "1751400000000-example". Use the "migrate:new" command to create one.`,
			data: { origin },
		});
	}
};

/** Validates imported migration files and inline definitions into migrations keyed by name. */
const collectExternalMigrations = (props: {
	definitions: MigrationDefinition[];
	modules: Array<{ path: string; module: { default?: unknown } }>;
}): Record<string, ExternalMigration> =>
	collectResourceModules({
		label: "migration",
		helper: "defineMigration",
		schema: migrationSchema,
		validateName: validateMigrationName,
		modules: props.modules,
		definitions: props.definitions.map(({ name, migration }) => ({
			name,
			value: migration,
		})),
	});

export default collectExternalMigrations;
