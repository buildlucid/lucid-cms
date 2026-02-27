import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import cacheKeys from "../../kv-adapter/cache-keys.js";
import type { MigrationPlan } from "../migration/types.js";
import type { CollectionSchema } from "../schema/types.js";

export type CachedMigrationResult = {
	migrationPlans: MigrationPlan[];
	inferedSchemas: CollectionSchema[];
};
type CachedMigrationResultResponse =
	| {
			data: CachedMigrationResult;
			error: undefined;
	  }
	| {
			data: undefined;
			error: LucidErrorData;
	  };

const MIGRATION_RESULT_KEY = cacheKeys.collection.migrationResult;

let migrationCache: CachedMigrationResult | undefined;
let inFlightMigrationResult: Promise<CachedMigrationResultResponse> | undefined;

const getCachedMigrationResult = async (
	context: ServiceContext,
): Promise<CachedMigrationResult | undefined> => {
	if (migrationCache) return migrationCache;

	const cached =
		await context.kv.get<CachedMigrationResult>(MIGRATION_RESULT_KEY);
	if (!cached) return undefined;

	migrationCache = cached;
	return migrationCache;
};

const setCachedMigrationResult = async (
	context: ServiceContext,
	result: CachedMigrationResult,
): Promise<void> => {
	migrationCache = result;
	await context.kv.set(MIGRATION_RESULT_KEY, result);
};

export const resolveCachedMigrationResult = async (
	context: ServiceContext,
	resolver: () => Promise<CachedMigrationResultResponse>,
): Promise<CachedMigrationResultResponse> => {
	const cachedResult = await getCachedMigrationResult(context);
	if (cachedResult) {
		return {
			data: cachedResult,
			error: undefined,
		};
	}

	if (inFlightMigrationResult) return inFlightMigrationResult;

	const pending = (async (): Promise<CachedMigrationResultResponse> => {
		try {
			const result = await resolver();
			if (!result.error) {
				await setCachedMigrationResult(context, result.data);
			}

			return result;
		} finally {
			inFlightMigrationResult = undefined;
		}
	})();

	inFlightMigrationResult = pending;

	return pending;
};
