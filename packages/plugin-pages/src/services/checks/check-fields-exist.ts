import { copy } from "@lucidcms/core";
import type {
	FieldError,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";

const checkFieldsExist = (data: {
	fields: {
		slug: FieldInputSchema | undefined;
		parentPage: FieldInputSchema | undefined;
		path: FieldInputSchema | undefined;
	};
}): Awaited<
	ServiceResponse<{
		slug: FieldInputSchema;
		parentPage: FieldInputSchema;
		path: FieldInputSchema;
	}>
> => {
	const fieldErrors: FieldError[] = [];

	if (data.fields.slug === undefined) {
		fieldErrors.push({
			key: "slug",
			localeCode: null,
			message: copy("server:plugin.pages.fields.validation.required"),
		});
	}
	if (data.fields.parentPage === undefined) {
		fieldErrors.push({
			key: "parentPage",
			localeCode: null,
			message: copy("server:plugin.pages.fields.validation.required"),
		});
	}
	if (data.fields.path === undefined) {
		fieldErrors.push({
			key: "path",
			localeCode: null,
			message: copy("server:plugin.pages.fields.validation.required"),
		});
	}

	if (fieldErrors.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:plugin.pages.fields.required.missing"),
				status: 400,
				errors: {
					fields: fieldErrors,
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			slug: data.fields.slug as FieldInputSchema,
			parentPage: data.fields.parentPage as FieldInputSchema,
			path: data.fields.path as FieldInputSchema,
		},
	};
};

export default checkFieldsExist;
