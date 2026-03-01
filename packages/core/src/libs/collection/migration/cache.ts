import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import cacheKeys from "../../kv-adapter/cache-keys.js";
import { getCollectionsSignature } from "../cache-signature.js";
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

const migrationCache = new Map<string, CachedMigrationResult>();
const inFlightMigrationResult = new Map<
	string,
	Promise<CachedMigrationResultResponse>
>();

const getCacheKey = (configSignature: string) =>
	`${MIGRATION_RESULT_KEY}:${configSignature}`;

const getCachedMigrationResult = async (
	context: ServiceContext,
	configSignature: string,
): Promise<CachedMigrationResult | undefined> => {
	const memoryCached = migrationCache.get(configSignature);
	if (memoryCached) return memoryCached;

	const cached = await context.kv.get<CachedMigrationResult>(
		getCacheKey(configSignature),
	);
	if (!cached) return undefined;

	migrationCache.set(configSignature, cached);
	return cached;
};

const setCachedMigrationResult = async (
	context: ServiceContext,
	configSignature: string,
	result: CachedMigrationResult,
): Promise<void> => {
	migrationCache.set(configSignature, result);
	await context.kv.set(getCacheKey(configSignature), result);
};

export const resolveCachedMigrationResult = async (
	context: ServiceContext,
	resolver: () => Promise<CachedMigrationResultResponse>,
): Promise<CachedMigrationResultResponse> => {
	const configSignature = getCollectionsSignature(context.config.collections);

	const cachedResult = await getCachedMigrationResult(context, configSignature);
	if (cachedResult) {
		return {
			data: cachedResult,
			error: undefined,
		};
	}

	const inFlight = inFlightMigrationResult.get(configSignature);
	if (inFlight) return inFlight;

	const pending = (async (): Promise<CachedMigrationResultResponse> => {
		try {
			const result = await resolver();
			if (!result.error) {
				await setCachedMigrationResult(context, configSignature, result.data);
			}

			return result;
		} finally {
			inFlightMigrationResult.delete(configSignature);
		}
	})();

	inFlightMigrationResult.set(configSignature, pending);

	return pending;
};
