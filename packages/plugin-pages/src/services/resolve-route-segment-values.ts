import { copy } from "@lucidcms/core/plugin";
import type { DocumentVersionType, ServiceFn } from "@lucidcms/core/types";
import type { CollectionConfig, RouteSegmentTarget } from "../types/types.js";
import formatFullSlug from "../utils/format-fullslug.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import fetchRouteSegmentValues, {
	targetKey,
} from "./helpers/fetch-route-segment-values.js";

const normalizeSegmentValue = (value: unknown) => {
	if (typeof value === "string") return value.trim() || null;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
};

/** Resolves batched relation targets into complete per-locale route prefixes. */
const resolveRouteSegmentValues: ServiceFn<
	[
		{
			collection: CollectionConfig;
			versionType: Exclude<DocumentVersionType, "revision">;
			targets: RouteSegmentTarget[];
			sourceKeys: string[];
		},
	],
	Map<string, Record<string, string | null>>
> = async (context, data) => {
	const locales = data.collection.localized
		? context.config.localization.locales.map((locale) => locale.code)
		: [context.config.localization.defaultLocale];

	if (data.collection.segments.length === 0) {
		return {
			error: undefined,
			data: new Map(
				data.sourceKeys.map((sourceKey) => [
					sourceKey,
					Object.fromEntries(
						locales.map((locale) => [
							locale,
							resolveCollectionPrefix({
								collection: data.collection,
								localeCode: locale,
							}) ?? null,
						]),
					),
				]),
			),
		};
	}

	const targetsBySource = new Map<string, RouteSegmentTarget[]>();
	for (const target of data.targets) {
		const sourceTargets = targetsBySource.get(target.sourceKey) ?? [];
		sourceTargets.push(target);
		targetsBySource.set(target.sourceKey, sourceTargets);
	}

	const valuesRes = await fetchRouteSegmentValues(context, {
		collection: data.collection,
		versionType: data.versionType,
		targets: data.targets,
		locales,
	});
	if (valuesRes.error) return valuesRes;

	const prefixes = new Map<string, Record<string, string | null>>();
	for (const sourceKey of data.sourceKeys) {
		const sourceTargets = targetsBySource.get(sourceKey) ?? [];
		const valuesByLocale: Record<string, string | null> = {};

		for (const locale of locales) {
			const values: string[] = [];
			for (const target of sourceTargets) {
				const targetLocale = target.localized
					? locale
					: context.config.localization.defaultLocale;
				const row = valuesRes.data.get(
					targetKey(target.collectionKey, target.documentId, targetLocale),
				);
				const value = normalizeSegmentValue(row?.[`segment_${target.index}`]);
				if (!value) {
					return {
						error: {
							type: "basic",
							status: 400,
							message: copy("server:plugin.pages.route.segment.value.missing"),
							errors: {
								fields: [
									{
										key: target.relation,
										localeCode: locale,
										message: copy(
											"server:plugin.pages.route.segment.value.missing",
										),
									},
								],
							},
						},
						data: undefined,
					};
				}
				values.push(value);
			}

			valuesByLocale[locale] = formatFullSlug(
				resolveCollectionPrefix({
					collection: data.collection,
					localeCode: locale,
				}),
				...values,
			);
		}

		prefixes.set(sourceKey, valuesByLocale);
	}

	return { error: undefined, data: prefixes };
};

export default resolveRouteSegmentValues;
