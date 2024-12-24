import createTableQuery from "./create-table-query.js";
import modifyTableQuery from "./modify-table-query.js";
import removeTableQuery from "./remove-table-query.js";
import type { ServiceFn, ServiceResponse } from "../../../types.js";
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
		const migrationBatches: ServiceResponse<undefined>[][] = [];
		const plans = data.migrationPlan.flatMap((mp) => mp.tables);
		const plansOrder = plans.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			//* put creates before modifies before removes
			const typeOrder = { create: 0, modify: 1, remove: 2 };
			return typeOrder[a.type] - typeOrder[b.type];
		});

		for (const plan of plansOrder) {
			if (!migrationBatches[plan.priority])
				migrationBatches[plan.priority] = [];

			switch (plan.type) {
				case "create":
					migrationBatches[plan.priority]?.push(
						createTableQuery(context, { migration: plan }),
					);
					break;
				case "modify":
					migrationBatches[plan.priority]?.push(
						modifyTableQuery(context, { migration: plan }),
					);
					break;
				case "remove":
					migrationBatches[plan.priority]?.push(
						removeTableQuery(context, { migration: plan }),
					);
					break;
			}
		}

		for (const batch of migrationBatches) {
			if (batch) {
				await Promise.all(batch);
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
				message: err instanceof Error ? err.message : "An error occurred",
			},
		};
	}
};

export default buildMigrations;
