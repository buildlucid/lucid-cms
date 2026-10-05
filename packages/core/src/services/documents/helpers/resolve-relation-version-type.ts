import constants from "../../../constants/constants.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import collections from "../../../libs/collection/collections.js";
import type { DocumentVersionType } from "../../../libs/db/tables/index.js";
import type { DocumentRefVersionTypeResolver } from "../../../libs/refs/documents/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

type RelationVersionType = Exclude<DocumentVersionType, "revision">;

export type RelationVersionTypeResolution = {
	versionType: RelationVersionType;
	resolveVersionType?: DocumentRefVersionTypeResolver;
};

const latestRelationVersionType = "latest" satisfies RelationVersionType;
const snapshotVersionType =
	constants.collectionBuilder.publishing.snapshotVersionType;

const findCollection = (
	collections: CollectionBuilder[],
	collectionKey: string,
) => {
	return collections.find((collection) => collection.key === collectionKey);
};

const findEnvironment = (
	collection: CollectionBuilder | undefined,
	versionType: RelationVersionType,
) => {
	return collection?.getData.publishing.targets.find(
		(environment) => environment.key === versionType,
	);
};

const resolveMappedDocumentVersionType = (props: {
	collections: CollectionBuilder[];
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
	targetCollectionKey?: string;
}): RelationVersionType | undefined => {
	if (
		props.targetCollectionKey === undefined ||
		props.sourceVersionType === latestRelationVersionType
	) {
		return props.sourceVersionType;
	}

	const sourceCollection = findCollection(
		props.collections,
		props.sourceCollectionKey,
	);
	const sourceEnvironment = findEnvironment(
		sourceCollection,
		props.sourceVersionType,
	);
	if (!sourceEnvironment) return props.sourceVersionType;

	const mappedVersionType =
		sourceEnvironment.collectionVersions?.[props.targetCollectionKey];
	if (mappedVersionType) return mappedVersionType;

	const targetCollection = findCollection(
		props.collections,
		props.targetCollectionKey,
	);
	const targetEnvironment = findEnvironment(
		targetCollection,
		props.sourceVersionType,
	);

	return targetEnvironment ? props.sourceVersionType : undefined;
};

export const resolveRelatedDocumentVersionType = (props: {
	collections: CollectionBuilder[];
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
	targetCollectionKey?: string;
}) => {
	return resolveMappedDocumentVersionType(props) ?? latestRelationVersionType;
};

/**
 * Projects a preview perspective onto another collection, using that request's
 * explicit version when no configured or same-named mapping exists.
 */
export const resolvePreviewCollectionVersionType = (props: {
	collections: CollectionBuilder[];
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
	targetCollectionKey: string;
	fallbackVersionType: DocumentVersionType;
}): DocumentVersionType => {
	return resolveMappedDocumentVersionType(props) ?? props.fallbackVersionType;
};

const createRelationVersionTypeResolver = (props: {
	collections: CollectionBuilder[];
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
}): DocumentRefVersionTypeResolver => {
	return (input) => {
		return resolveRelatedDocumentVersionType({
			collections: props.collections,
			sourceCollectionKey: props.sourceCollectionKey,
			sourceVersionType: props.sourceVersionType,
			targetCollectionKey: input.collectionKey,
		});
	};
};

/**
 * Resolves the version context used when hydrating document relation refs.
 *
 * The document being fetched and the documents it references do not always use
 * the same version type. Latest documents hydrate latest refs, revisions keep
 * the historical document body but still preview refs from latest, and release
 * proposals and snapshots also hydrate against latest.
 *
 * The returned `resolveVersionType` is per related collection. That lets source
 * environments map to different target environments, falls back to same-named
 * target environments when they exist, and finally uses latest when a target
 * collection does not support the source environment.
 */
const resolveRelationVersionType: ServiceFn<
	[
		{
			collectionKey: string;
			documentId?: number;
			versionId?: number;
			versionType: DocumentVersionType;
		},
	],
	RelationVersionTypeResolution
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const versionType =
		data.versionType === "revision" ||
		data.versionType === snapshotVersionType ||
		data.versionType ===
			constants.collectionBuilder.publishing.proposalVersionType
			? latestRelationVersionType
			: data.versionType;

	return {
		error: undefined,
		data: {
			versionType,
			resolveVersionType: createRelationVersionTypeResolver({
				collections: collectionsRes.data,
				sourceCollectionKey: data.collectionKey,
				sourceVersionType: versionType,
			}),
		},
	};
};

export default resolveRelationVersionType;
