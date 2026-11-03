import z from "zod";
import constants from "../../constants/constants.js";
import { diagnosticsFormatter } from "../../libs/formatters/index.js";
import cacheKeys from "../../libs/kv/cache-keys.js";
import fetchLatestPackage from "../../libs/package-updates/fetch-latest-package.js";
import getInstalledPackages from "../../libs/package-updates/get-installed-packages.js";
import type { DiagnosticPackageUpdate } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

//* failed lookups are cached as `latest: null`, so an unreachable npm isn't asked on every request
const cachedLatestSchema = z.object({
	latest: z
		.object({
			version: z.string(),
			requiresCore: z.string().nullable(),
		})
		.nullable(),
});

/**
 * Compares installed packages with their latest versions on npm, caching each lookup in KV.
 * Returns an empty list when update checks are off. A failing KV adapter only skips the cache,
 * as the KV health check reports it.
 */
const getPackageUpdates: ServiceFn<[], DiagnosticPackageUpdate[]> = async (
	context,
) => {
	if (!context.config.updateChecks) return { error: undefined, data: [] };

	const packages = getInstalledPackages({
		config: context.config,
		runtimeContext: context.runtimeContext,
	});
	const cached = await context.kv
		.getMany(context, {
			keys: packages.map((item) =>
				cacheKeys.diagnostics.latestPackage(item.name),
			),
		})
		.catch(() => []);

	const updates = await Promise.all(
		packages.map(async (item, index) => {
			const hit = cachedLatestSchema.safeParse(cached[index]?.value);
			if (hit.success) {
				return diagnosticsFormatter.formatPackageUpdate({
					package: item,
					latest: hit.data.latest,
				});
			}

			const latest = await fetchLatestPackage(item.name);
			await context.kv
				.set(context, {
					key: cacheKeys.diagnostics.latestPackage(item.name),
					value: { latest },
					ttlSeconds: latest
						? constants.updateChecks.ttlSeconds
						: constants.updateChecks.failedTtlSeconds,
				})
				.catch(() => undefined);
			return diagnosticsFormatter.formatPackageUpdate({
				package: item,
				latest,
			});
		}),
	);

	return { error: undefined, data: updates };
};

export default getPackageUpdates;
