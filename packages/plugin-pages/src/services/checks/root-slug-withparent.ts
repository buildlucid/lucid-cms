import type {
	FieldError,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import T from "../../translations/index.js";
import type { CollectionConfig } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";

/**
 *  If slug is / and parentPage is set (would cause fullSlug to be the same as parentPage just with trailing slash)
 */
const checkRootSlugWithParent = (data: {
	collection: CollectionConfig;
	defaultLocale: string;
	fields: {
		slug: FieldInputSchema;
		parentPage: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	const parentPageId = getParentPageId(data.fields.parentPage);

	if (data.collection.useTranslations && data.fields.slug.translations) {
		const fieldErrors: FieldError[] = [];
		for (const [key, value] of Object.entries(data.fields.slug.translations)) {
			if (value === "/" && parentPageId !== null) {
				fieldErrors.push({
					key: constants.fields.slug.key,
					localeCode: key,
					message: T("slug_cannot_be_slash_and_parent_page_set_message"),
				});
			}
		}
		if (fieldErrors.length > 0) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: T("slug_cannot_be_slash_and_parent_page_set_message"),
					errors: {
						fields: fieldErrors,
					},
				},
				data: undefined,
			};
		}
	} else if (data.fields.slug.value === "/" && parentPageId !== null) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("slug_cannot_be_slash_and_parent_page_set_message"),
				errors: {
					fields: [
						{
							key: constants.fields.parentPage.key,
							message: T("slug_cannot_be_slash_and_parent_page_set_message"),
						},
					],
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkRootSlugWithParent;
