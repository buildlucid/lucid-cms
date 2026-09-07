import { copy } from "../../../libs/i18n/index.js";
import type { DocumentEditToken } from "../../../libs/toolkit/documents/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readDocumentContent from "./read-document-content.js";

/** Checks a conditional deletion after its caller has acquired the document claim. */
const checkEditToken: ServiceFn<
	[{ collectionKey: string; id: number; ifUnchanged?: DocumentEditToken }],
	undefined
> = async (context, input) => {
	if (input.ifUnchanged === undefined)
		return { error: undefined, data: undefined };

	const content = await readDocumentContent(context, {
		...input,
		allowWriteLock: true,
	});
	if (content.error) return content;
	if (content.data.editToken !== input.ifUnchanged) {
		return {
			error: {
				status: 409,
				message: copy("server:core.documents.authoring.write.changed"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkEditToken;
