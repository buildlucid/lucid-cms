import { copy } from "../../../libs/i18n/index.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** Reads a structural object without copying its values. */
const readDocumentObject = (
	value: unknown,
	path: string,
): Awaited<ServiceResponse<Record<string, unknown>>> => {
	if (!isPlainObject(value)) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.object.required", {
					data: { path },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: value };
};

export default readDocumentObject;
