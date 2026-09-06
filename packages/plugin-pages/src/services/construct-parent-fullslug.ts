import { copy } from "@lucidcms/core";
import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import buildFullSlug from "../utils/build-fullslug-from-fullslug.js";
import normalizePathValue from "../utils/normalize-path-value.js";
import resolveCollectionPrefix from "../utils/resolve-collection-prefix.js";
import type { ResolvedPagesCollectionLocalization } from "../utils/resolve-pages-collection-localization.js";
import type { ParentPageQueryResponse } from "./get-parent-fields.js";

const parentMatchesRoutePrefix = (
	parentFields: ParentPageQueryResponse[],
	locale: string | null,
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
	localization: ResolvedPagesCollectionLocalization;
	fields: {
		slug: FieldInputSchema;
	};
	routePrefixes?: Map<string | null, string | null>;
	missingParentIsEmpty?: boolean;
}): Awaited<ServiceResponse<Map<string | null, string | null>>> => {
	if (!data.missingParentIsEmpty && data.parentFields.length > 0) {
		const missingParentLocale = data.localization.locales.find((locale) => {
			const slug =
				locale === null
					? data.fields.slug.value
					: data.fields.slug.translations?.[locale];
			return (
				typeof slug === "string" &&
				slug.trim() !== "" &&
				!normalizePathValue(
					data.parentFields.find((field) => field.locale === locale)?._fullSlug,
				)
			);
		});
		if (missingParentLocale !== undefined) {
			const message = copy("server:plugin.pages.parent.locale.route.missing");
			return {
				error: {
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: [
							{ key: "parentPage", localeCode: missingParentLocale, message },
						],
					},
				},
				data: undefined,
			};
		}
	}
	// initialise fullSlug with null values for each locale
	const fullSlug = new Map<string | null, string | null>(
		data.localization.locales.map((locale) => [locale, null]),
	);

	// if translations are enabled/set
	if (data.localization.enabled && data.fields.slug.translations) {
		for (let i = 0; i < data.localization.locales.length; i++) {
			const locale = data.localization.locales[i];
			if (!locale) continue;
			const routePrefix =
				data.routePrefixes?.get(locale) ??
				resolveCollectionPrefix({
					collection: data.collection,
					localeCode: locale,
				});
			if (
				data.collection.segments.length > 0 &&
				!parentMatchesRoutePrefix(data.parentFields, locale, routePrefix)
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
									localeCode: locale,
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

			fullSlug.set(
				locale,
				buildFullSlug({
					parentFields: data.parentFields || [],
					targetLocale: locale,
					slug: data.fields.slug.translations[locale],
					prefix: routePrefix,
				}),
			);
		}
	} else {
		const routePrefix =
			data.routePrefixes?.get(data.localization.defaultLocale) ??
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
		fullSlug.set(
			data.localization.defaultLocale,
			buildFullSlug({
				parentFields: data.parentFields || [],
				targetLocale: data.localization.defaultLocale,
				slug: data.fields.slug.value,
				prefix: routePrefix,
			}),
		);
	}

	return {
		error: undefined,
		data: fullSlug,
	};
};

export default constructParentFullSlug;
