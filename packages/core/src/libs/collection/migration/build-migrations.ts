import type { ServiceFn } from "../../../types.js";
import { copy } from "../../i18n/index.js";
import createTableQuery from "./create-table-query.js";
import modifyTableQuery from "./modify-table-query.js";
import removeTableQuery from "./remove-table-query.js";
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
	try {
		const allTablePlans = data.migrationPlan.flatMap((mp) => mp.tables);
		const sortedPlans = allTablePlans.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			//* within same priority, order by query type (move -> create -> modify)
			const typeOrder = { remove: 0, create: 1, modify: 2 };
			return typeOrder[a.type] - typeOrder[b.type];
		});

		//* get unique prio levels
		const priorities = [
			...new Set(sortedPlans.map((plan) => plan.priority)),
		].sort((a, b) => b - a);

		//* build batches based on prio and process them
		for (const priority of priorities) {
			const batch = sortedPlans.filter((plan) => plan.priority === priority);

			for (const plan of batch) {
				let result: Awaited<ReturnType<typeof createTableQuery>> | undefined;
				switch (plan.type) {
					case "create": {
						result = await createTableQuery(context, { migration: plan });
						break;
					}
					case "modify": {
						result = await modifyTableQuery(context, { migration: plan });
						break;
					}
					case "remove": {
						result = await removeTableQuery(context, { migration: plan });
						break;
					}
				}

				if (result?.error) return result;
			}
		}

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message: copy("server:core.errors.default.message", {
					defaultMessage:
						err instanceof Error ? err.message : "An error occurred",
				}),
			},
		};
	}
};

export default buildMigrations;
