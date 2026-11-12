import { mkdir } from "node:fs/promises";
import path from "node:path";
import createDatabaseName from "../databases/create-database-name.ts";
import createEmptyDatabase from "../databases/create-empty-database.ts";
import type { DatabaseDriver } from "../databases/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { RunningCommand } from "../utils/run-command.ts";
import createMigrationDatabase from "./create-migration-database.ts";
import type { MigrationTemplates } from "./create-migration-templates.ts";
import type { Migrations } from "./types.ts";

/**
 * Creates empty or template-based migration databases. `destroy` stops outstanding commands and
 * removes all created databases.
 */
const createMigrations = (options: {
	context: HarnessContext;
	driver: DatabaseDriver;
	templates: MigrationTemplates;
}): Migrations & { destroy(): Promise<void> } => {
	const { context, driver, templates } = options;
	const destroys: Array<() => Promise<void>> = [];
	const running = new Set<RunningCommand>();

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
			const seeds = path.join(context.paths.work, `${location.name}-seeds`);
			await mkdir(seeds, { recursive: true });

			return createMigrationDatabase({
				context,
				name: location.name,
				url: provisioned.url,
				uploads: path.join(context.paths.work, `${location.name}-uploads`),
				seeds,
				running,
			});
		},
		destroy: async () => {
			//* a test that timed out leaves its command running, which would outlive the run
			await Promise.all([...running].map((command) => command.stop()));
			for (const destroy of destroys) {
				await destroy().catch(() => undefined);
			}
		},
	};
};

export default createMigrations;
