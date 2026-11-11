import type { PrepareDatabase, Step } from "./types.ts";

const prepared = new Map<Step, PrepareDatabase>();

/**
 * Prepares a database migrated to a schema step, for `migrations.database()`. The same step
 * always gives the same function, so every test asking for it shares one template.
 *
 * @example
 * ```ts
 * const database = await migrations.database(migratedTo("article/base"));
 * ```
 */
const migratedTo = (step: Step): PrepareDatabase => {
	let prepare = prepared.get(step);
	if (!prepare) {
		prepare = async (database) => {
			const migrated = await database.cli(step, "migrate", "--yes");
			if (migrated.code !== 0) {
				throw new Error(
					`Migrating to ${step ?? "the setup's config"} failed.\n${migrated.output}`,
				);
			}
		};
		prepared.set(step, prepare);
	}
	return prepare;
};

export default migratedTo;
