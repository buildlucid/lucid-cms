import type { MigrationPlan } from "../migration/types.js";
import type { CollectionSchema } from "../schema/types.js";

// TODO: replace with KV solution

let migrationCache:
	| {
			migrationPlans: MigrationPlan[];
			inferedSchemas: CollectionSchema[];
	  }
	| undefined;

export const getCachedMigrationResult = () => {
	if (!migrationCache) return undefined;

	return migrationCache;
};

export const setCachedMigrationResult = (result: {
	migrationPlans: MigrationPlan[];
	inferedSchemas: CollectionSchema[];
}): void => {
	migrationCache = result;
};

export const clearMigrationCache = (): void => {
	migrationCache = undefined;
};
