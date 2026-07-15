import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { resolveRelatedDocumentVersionType } from "../documents/helpers/resolve-relation-version-type.js";
import isExactPreview from "./helpers/is-exact-preview.js";
import resolveSession from "./helpers/resolve-session.js";
import type { PreviewSessionDocumentTarget } from "./types.js";

const authorize: ServiceFn<
	[
		{
			token: string;
			collectionKey: string;
		},
	],
	PreviewSessionDocumentTarget
> = async (context, data) => {
	const sessionRes = await resolveSession(context, { token: data.token });
	if (sessionRes.error) return sessionRes;

	const session = sessionRes.data;

	if (isExactPreview(session.entry_version_type)) {
		if (
			data.collectionKey !== session.entry_collection_key ||
			session.entry_version_id === null
		) {
			return {
				error: {
					type: "forbidden",
					code: "preview_scope",
					message: copy("server:core.documents.preview.scope.message"),
					status: 403,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				mode: "exact",
				entry: {
					collectionKey: session.entry_collection_key,
					documentId: session.entry_document_id,
					versionType: session.entry_version_type,
					versionId: session.entry_version_id,
				},
			},
		};
	}

	return {
		error: undefined,
		data: {
			mode: "perspective",
			entry: {
				collectionKey: session.entry_collection_key,
				documentId: session.entry_document_id,
			},
			versionType: resolveRelatedDocumentVersionType({
				config: context.config,
				sourceCollectionKey: session.entry_collection_key,
				sourceVersionType: session.entry_version_type,
				targetCollectionKey: data.collectionKey,
			}),
		},
	};
};

export default authorize;
