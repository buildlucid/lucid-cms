import collections from "../../libs/collection/collections.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveRelationVersionType, {
	resolvePreviewCollectionVersionType,
} from "../documents/helpers/resolve-relation-version-type.js";
import resolveSession from "./helpers/resolve-session.js";
import type { PreviewSessionDocumentTarget } from "./types.js";

/**
 * Validates the preview token before resolving access. Scoped previews restrict the entry
 * collection to its document and target: latest and environment targets remain fluid, revisions
 * and snapshots stay pinned. Other collections allow supporting content reads, using perspective
 * mappings where available or the requested version otherwise.
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
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const session = sessionRes.data;
	const fallbackTarget = {
		versionType: data.versionType,
		versionId: data.versionId,
	};
	const resolveCollectionTarget = (
		sourceVersionType: Exclude<typeof session.entry_version_type, "revision">,
	) => {
		const versionType = resolvePreviewCollectionVersionType({
			collections: collectionsRes.data,
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
					sessionId: session.id,
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
					sessionId: session.id,
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
			versionType: session.entry_version_type,
		});
		if (relationVersionTypeRes.error) return relationVersionTypeRes;

		return {
			error: undefined,
			data: {
				sessionId: session.id,
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
			sessionId: session.id,
			mode: "navigable",
			entry: {
				collectionKey: session.entry_collection_key,
				documentId: session.entry_document_id,
			},
			...resolveCollectionTarget(session.entry_version_type),
		},
	};
};

export default authorize;
