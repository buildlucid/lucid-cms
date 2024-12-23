import type { ServiceFn } from "../../../types.js";
import type { MigrationPlan } from "./types.js";

/**
 * Builds and runs migrations based on the migration plan
 */
const buildMigrations: ServiceFn<
	[
		{
			migrationPlan: MigrationPlan[];
		},
	],
	undefined
> = async (context, data) => {
	const tables = data.migrationPlan.flatMap((mp) => mp.tables);
	const migraitonOrder = tables.sort((a, b) => {
		if (a.priority !== b.priority) {
			return b.priority - a.priority;
		}
		//* put creates before modifies before removes
		const typeOrder = { create: 0, modify: 1, remove: 2 };
		return typeOrder[a.type] - typeOrder[b.type];
	});

	const migrationBatches = [];

	return {
		data: undefined,
		error: undefined,
	};
};

export default buildMigrations;
