import { copy } from "@lucidcms/core/plugin";
import type {
	Config,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import buildFullSlug from "../utils/build-fullslug-from-fullslug.js";
import normalizePathValue from "../utils/normalize-path-value.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import type { ParentPageQueryResponse } from "./get-parent-fields.js";

const parentMatchesRoutePrefix = (
	parentFields: ParentPageQueryResponse[],
	locale: string,
	prefix: string | null | undefined,
) => {
	const parentFullSlug = normalizePathValue(
		parentFields.find((field) => field.locale === locale)?._fullSlug,
	);
	const normalizedPrefix = normalizePathValue(prefix);
	if (!parentFullSlug || !normalizedPrefix || normalizedPrefix === "/")
		return true;
	return (
		parentFullSlug === normalizedPrefix ||
		parentFullSlug.startsWith(`${normalizedPrefix}/`)
	);
};

/**
 *  Constructs the fullSlug from the slug and parentPage fields
 */
const constructParentFullSlug = (data: {
	collection: CollectionConfig;
	parentFields: Array<ParentPageQueryResponse>;
	localization: Config["localization"];
	fields: {
		slug: FieldInputSchema;
	};
	routePrefixes?: Record<string, string | null>;
}): Awaited<ServiceResponse<Record<string, string | null>>> => {
	// initialise fullSlug with null values for each locale
	const fullSlug: Record<string, string | null> =
		data.localization.locales.reduce<Record<string, string | null>>(
			(acc, locale) => {
				acc[locale.code] = null;
				return acc;
			},
			{},
		);

	// if translations are enabled/set
	if (data.collection.localized && data.fields.slug.translations) {
		for (let i = 0; i < data.localization.locales.length; i++) {
			const locale = data.localization.locales[i];
			if (!locale) continue;
			const routePrefix =
				data.routePrefixes?.[locale.code] ??
				resolveCollectionPrefix({
					collection: data.collection,
					localeCode: locale.code,
				});
			if (
				data.collection.segments.length > 0 &&
				!parentMatchesRoutePrefix(data.parentFields, locale.code, routePrefix)
			) {
				return {
					error: {
						type: "basic",
						status: 400,
						message: copy("server:plugin.pages.route.segment.parent.mismatch"),
						errors: {
							fields: [
								{
									key: "parentPage",
									localeCode: locale.code,
									message: copy(
										"server:plugin.pages.route.segment.parent.mismatch",
									),
								},
							],
						},
					},
					data: undefined,
				};
			}

			fullSlug[locale.code] = buildFullSlug({
				parentFields: data.parentFields || [],
				targetLocale: locale.code,
				slug: data.fields.slug.translations[locale.code],
				prefix: routePrefix,
			});
		}
	} else {
		const routePrefix =
			data.routePrefixes?.[data.localization.defaultLocale] ??
			resolveCollectionPrefix({
				collection: data.collection,
				localeCode: data.localization.defaultLocale,
			});
		if (
			data.collection.segments.length > 0 &&
			!parentMatchesRoutePrefix(
				data.parentFields,
				data.localization.defaultLocale,
				routePrefix,
			)
		) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:plugin.pages.route.segment.parent.mismatch"),
					errors: {
						fields: [
							{
								key: "parentPage",
								message: copy(
									"server:plugin.pages.route.segment.parent.mismatch",
								),
							},
						],
					},
				},
				data: undefined,
			};
		}
		fullSlug[data.localization.defaultLocale] = buildFullSlug({
			parentFields: data.parentFields || [],
			targetLocale: data.localization.defaultLocale,
			slug: data.fields.slug.value,
			prefix: routePrefix,
		});
	}

	return {
		error: undefined,
		data: fullSlug,
	};
};

export default constructParentFullSlug;
