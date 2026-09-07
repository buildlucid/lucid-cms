import { copy } from "../../libs/i18n/index.js";
import type {
	DocumentEditableData,
	DocumentEditToken,
} from "../../libs/toolkit/documents/types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import readDocumentContent from "./helpers/read-document-content.js";
import readDocumentState from "./helpers/read-document-state.js";

/** Checks that a read did not overlap an in-place admin save or a latest-version replacement. */
const getEditable: ServiceFn<
	[{ collectionKey: string; id: number }],
	{
		id: number;
		editToken: DocumentEditToken;
		version: { id: number; type: "latest"; contentId: string };
		data: DocumentEditableData;
	}
> = async (context, input) => {
	const content = await readDocumentContent(context, input);
	if (content.error) return content;

	const state = await readDocumentState(context, input);
	if (state.error) return state;
	if (
		content.data.writeLock ||
		state.data.writeLock ||
		content.data.stateToken !== state.data.editToken
	) {
		return {
			error: {
				status: 409,
				message: copy("server:core.documents.authoring.read.changed"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: input.id,
			editToken: content.data.editToken,
			version: state.data.version,
			data: content.data.data,
		},
	};
};

export default getEditable;
