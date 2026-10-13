import { createHash } from "node:crypto";
import collections from "../../../libs/collection/collections.js";
import { copy } from "../../../libs/i18n/index.js";
import { documentEditTokenSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import readStoredContent from "../../documents-versions/helpers/read-stored-content.js";
import fromDocumentInput from "./from-document-input.js";
import readDocumentState from "./read-document-state.js";

/** Reads persisted authoring content; callers hold a write claim or verify state again after reading. */
const readDocumentContent = async (
	context: ServiceContext,
	input: {
		collectionKey: string;
		id: number;
		/** Version type to read (eg. an environment), defaulting to latest. */
		version?: string;
		/** Reads this version, eg. a request proposal, instead of a version type. */
		versionId?: number;
		allowWriteLock?: boolean;
	},
) => {
	const [state, collection] = await Promise.all([
		readDocumentState(context, input),
		collections.getSingle(context, { key: input.collectionKey }),
	]);
	if (state.error) return state;
	if (collection.error) return collection;

	const storedRes = await readStoredContent(context, {
		collection: collection.data,
		documentId: input.id,
		versionId: state.data.version.id,
	});
	if (storedRes.error) return storedRes;

	const stored = storedRes.data;
	if (!stored) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.authoring.content.not.found"),
			},
			data: undefined,
		};
	}

	const data = fromDocumentInput(
		{ collection: collection.data, localization: context.config.localization },
		stored,
	);
	if (data.error) return data;

	//* include stored values so reference cleanup also invalidates an earlier edit token
	const editToken = documentEditTokenSchema.parse(
		createHash("sha256")
			.update(JSON.stringify([state.data.editToken, data.data]))
			.digest("hex"),
	);

	return {
		error: undefined,
		data: {
			...state.data,
			stateToken: state.data.editToken,
			editToken,
			collection: collection.data,
			stored,
			data: data.data,
		},
	};
};

export default readDocumentContent;
