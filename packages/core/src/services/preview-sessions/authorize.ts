import type { ServiceFn } from "../../utils/services/types.js";
import resolveRelationVersionType, {
	resolvePreviewCollectionVersionType,
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
 * supporting content such as menus, settings, or article carousels. Projectable
 * preview perspectives use configured or same-named collection mappings. Exact
 * revisions and collections without a mapping use the request's explicit version.
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
			versionType: string;
			versionId?: number;
		},
	],
	PreviewSessionDocumentTarget
> = async (context, data) => {
	const sessionRes = await resolveSession(context, { token: data.token });
	if (sessionRes.error) return sessionRes;

	const session = sessionRes.data;
	const fallbackTarget = {
		versionType: data.versionType,
		versionId: data.versionId,
	};
	const resolveCollectionTarget = (
		sourceVersionType: Exclude<typeof session.entry_version_type, "revision">,
	) => {
		const versionType = resolvePreviewCollectionVersionType({
			config: context.config,
			sourceCollectionKey: session.entry_collection_key,
			sourceVersionType,
			targetCollectionKey: data.collectionKey,
			fallbackVersionType: data.versionType,
		});

		return {
			versionType,
			...(versionType === fallbackTarget.versionType &&
			fallbackTarget.versionId !== undefined
				? { versionId: fallbackTarget.versionId }
				: {}),
		};
	};

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

		if (session.entry_version_type === "revision") {
			return {
				error: undefined,
				data: {
					mode: "scoped",
					target: "auxiliary",
					entry: {
						collectionKey: session.entry_collection_key,
						documentId: session.entry_document_id,
					},
					...fallbackTarget,
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
				...resolveCollectionTarget(relationVersionTypeRes.data.versionType),
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
			...resolveCollectionTarget(session.entry_version_type),
		},
	};
};

export default authorize;
