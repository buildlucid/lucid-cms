import { serverText } from "@lucidcms/core/plugin";
import type {
	FieldError,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
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

	if (data.collection.localized && data.fields.slug.translations) {
		const fieldErrors: FieldError[] = [];
		for (const [key, value] of Object.entries(data.fields.slug.translations)) {
			if (value === "/" && parentPageId !== null) {
				fieldErrors.push({
					key: constants.fields.slug.key,
					localeCode: key,
					message: serverText("plugin.pages.slug.root.with.parent.denied"),
				});
			}
		}
		if (fieldErrors.length > 0) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: serverText("plugin.pages.slug.root.with.parent.denied"),
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
				message: serverText("plugin.pages.slug.root.with.parent.denied"),
				errors: {
					fields: [
						{
							key: constants.fields.parentPage.key,
							message: serverText("plugin.pages.slug.root.with.parent.denied"),
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
