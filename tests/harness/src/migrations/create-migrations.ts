import createDatabaseName from "../databases/create-database-name.ts";
import createEmptyDatabase from "../databases/create-empty-database.ts";
import type { DatabaseDriver } from "../databases/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import createMigrationDatabase from "./create-migration-database.ts";
import type { MigrationTemplates } from "./create-migration-templates.ts";
import type { Migrations } from "./types.ts";

/**
 * What the `migrations` fixture gives a test: databases that start empty, or as a shared
 * template left them. `destroy` removes every database it made.
 */
const createMigrations = (options: {
	context: HarnessContext;
	driver: DatabaseDriver;
	templates: MigrationTemplates;
}): Migrations & { destroy(): Promise<void> } => {
	const { context, driver, templates } = options;
	const destroys: Array<() => Promise<void>> = [];

	return {
		database: async (prepare) => {
			const location = {
				directory: context.paths.work,
				name: createDatabaseName(context.runId, "migration"),
			};
			const provisioned = prepare
				? await driver.clone(await templates.get(prepare), location)
				: await createEmptyDatabase(driver, location);
			destroys.push(provisioned.destroy);

			return createMigrationDatabase({
				context,
				name: location.name,
				url: provisioned.url,
			});
		},
		destroy: async () => {
			for (const destroy of destroys) {
				await destroy().catch(() => undefined);
			}
		},
	};
};

export default createMigrations;
