import T from "../../translations/index.js";
import constants from "../../constants.js";
import type { FieldSchemaType, ServiceResponse } from "@lucidcms/core/types";

/**
 *  Returns an error if the parentPage field is set to the same document as the current document
 */
const checkParentIsPageOfSelf = (data: {
	defaultLocale: string;
	documentId: number;
	fields: {
		parentPage: FieldSchemaType;
	};
}): Awaited<ServiceResponse<undefined>> => {
	if (
		data.fields.parentPage.value &&
		data.fields.parentPage.value === data.documentId
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_have_self_as_parent_page_message"),
				errorResponse: {
					body: {
						fields: [
							{
								key: constants.fields.parentPage.key,
								localeCode: data.defaultLocale, //* parentPage doesnt use translations so always use default locale
								message: T("cannot_have_self_as_parent_page_message"),
							},
						],
					},
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
