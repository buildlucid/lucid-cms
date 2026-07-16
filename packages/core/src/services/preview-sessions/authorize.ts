import type { ServiceFn } from "../../utils/services/types.js";
import resolveRelationVersionType, {
	resolveRelatedDocumentVersionType,
} from "../documents/helpers/resolve-relation-version-type.js";
import resolveSession from "./helpers/resolve-session.js";
import type { PreviewSessionDocumentTarget } from "./types.js";

/**
 * Authorizes a preview token and resolves the requested collection's version.
 *
 * A scoped preview deliberately applies different access rules to its entry
 * collection and to auxiliary collections. Reads against the entry collection
 * stay locked to its document and version target. Latest and environment
 * targets remain fluid; revision and snapshot targets use their pinned version.
 * Reads against other collections are allowed so that the rendered page can load
 * supporting content such as menus, settings, or article carousels. Those reads
 * inherit the entry's effective version context and collection relation mapping,
 * but are not restricted to a particular auxiliary document.
 *
 * The preview token is validated before either path. This distinction limits
 * access to other documents in the previewed collection without breaking pages
 * that are composed from several collections.
 */
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

	if (session.mode === "scoped") {
		if (data.collectionKey === session.entry_collection_key) {
			return {
				error: undefined,
				data: {
					mode: "scoped",
					target: "entry",
					entry: {
						collectionKey: session.entry_collection_key,
						documentId: session.entry_document_id,
						versionType: session.entry_version_type,
						versionId: session.entry_version_id ?? undefined,
					},
				},
			};
		}

		const relationVersionTypeRes = await resolveRelationVersionType(context, {
			collectionKey: session.entry_collection_key,
			documentId: session.entry_document_id,
			versionType: session.entry_version_type,
			versionId: session.entry_version_id ?? undefined,
		});
		if (relationVersionTypeRes.error) return relationVersionTypeRes;

		return {
			error: undefined,
			data: {
				mode: "scoped",
				target: "auxiliary",
				entry: {
					collectionKey: session.entry_collection_key,
					documentId: session.entry_document_id,
				},
				versionType: resolveRelatedDocumentVersionType({
					config: context.config,
					sourceCollectionKey: session.entry_collection_key,
					sourceVersionType: relationVersionTypeRes.data.versionType,
					targetCollectionKey: data.collectionKey,
				}),
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
