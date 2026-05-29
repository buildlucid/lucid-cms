import { text } from "@lucidcms/core/plugin";
import type { FieldInputSchema, ServiceResponse } from "@lucidcms/core/types";
import constants from "../../constants.js";
import getParentPageId from "../../utils/get-parent-page-id.js";

/**
 *  Returns an error if the parentPage field is set to the same document as the current document
 */
const checkParentIsPageOfSelf = (data: {
	defaultLocale: string;
	documentId: number;
	fields: {
		parentPage: FieldInputSchema;
	};
}): Awaited<ServiceResponse<undefined>> => {
	const parentPageId = getParentPageId(data.fields.parentPage);

	if (parentPageId !== null && parentPageId === data.documentId) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: text.server("plugin.pages.parents.self.denied"),
				errors: {
					fields: [
						{
							key: constants.fields.parentPage.key,
							localeCode: data.defaultLocale, //* parentPage doesnt use translations so always use default locale
							message: text.server("plugin.pages.parents.self.denied"),
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

export default checkParentIsPageOfSelf;
