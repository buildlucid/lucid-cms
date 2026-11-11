import createDatabaseName from "../databases/create-database-name.ts";
import type { DatabaseDriver } from "../databases/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { JsonObject } from "../utils/json.ts";
import createMigrationDatabase from "./create-migration-database.ts";
import type { PrepareDatabase } from "./types.ts";

/**
 * Caches prepared database templates by function identity. Reuse the same `prepare` function
 * across tests; `destroy` removes all templates.
 */
const createMigrationTemplates = (options: {
	context: HarnessContext;
	driver: DatabaseDriver;
}) => {
	const { context, driver } = options;
	const templates = new Map<PrepareDatabase, Promise<JsonObject>>();

	const make = async (prepare: PrepareDatabase): Promise<JsonObject> => {
		const name = createDatabaseName(context.runId, "template");
		const pending = await driver.createTemplate({
			directory: context.paths.work,
			name,
		});
		try {
			await prepare(
				createMigrationDatabase({ context, name, url: pending.url }),
			);
			return await pending.seal();
		} catch (error) {
			await pending.discard();
			throw error;
		}
	};

	return {
		/** The template `prepare` makes, which every test that asks for it shares. */
		get: (prepare: PrepareDatabase): Promise<JsonObject> => {
			let template = templates.get(prepare);
			if (!template) {
				template = make(prepare);
				templates.set(prepare, template);
			}
			return template;
		},
		destroy: async (): Promise<void> => {
			for (const template of templates.values()) {
				await template
					.then((state) => driver.destroyTemplate(state))
					.catch(() => undefined);
			}
		},
	};
};

export type MigrationTemplates = ReturnType<typeof createMigrationTemplates>;

export default createMigrationTemplates;
