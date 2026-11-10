import constants from "../../../constants/constants.js";
import collections from "../../../libs/collection/collections.js";
import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
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
	collections: CollectionDefinition[],
	collectionKey: string,
) => {
	return collections.find((collection) => collection.key === collectionKey);
};

const findEnvironment = (
	collection: CollectionDefinition | undefined,
	versionType: RelationVersionType,
) => {
	return collection?.getData.publishing.environments.find(
		(environment) => environment.key === versionType,
	);
};

const resolveMappedDocumentVersionType = (props: {
	collections: CollectionDefinition[];
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

/** Maps a source document's version to its related document's version, treating pinned sources as latest. */
export const resolveRelatedDocumentVersionType = (props: {
	collections: CollectionDefinition[];
	sourceCollectionKey: string;
	sourceVersionType: DocumentVersionType;
	targetCollectionKey?: string;
}) => {
	return (
		resolveMappedDocumentVersionType({
			...props,
			sourceVersionType: toRelationSourceVersionType(props.sourceVersionType),
		}) ?? latestRelationVersionType
	);
};

/**
 * Projects a preview perspective onto another collection, using that request's
 * explicit version when no configured or same-named mapping exists.
 */
export const resolvePreviewCollectionVersionType = (props: {
	collections: CollectionDefinition[];
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
	targetCollectionKey: string;
	fallbackVersionType: DocumentVersionType;
}): DocumentVersionType => {
	return resolveMappedDocumentVersionType(props) ?? props.fallbackVersionType;
};

/** The version a document's relations are read against: revisions, snapshots and request proposals read latest. */
const toRelationSourceVersionType = (
	versionType: DocumentVersionType,
): RelationVersionType =>
	versionType === "revision" ||
	versionType === snapshotVersionType ||
	versionType === constants.collectionBuilder.publishing.proposalVersionType
		? latestRelationVersionType
		: versionType;

const createRelationVersionTypeResolver = (props: {
	collections: CollectionDefinition[];
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
 * Resolves relation versions per target collection. Latest, revisions and request versions use
 * latest refs. Environments use configured mappings, then a same-named target environment, then
 * latest.
 */
const resolveRelationVersionType: ServiceFn<
	[
		{
			collectionKey: string;
			versionType: DocumentVersionType;
		},
	],
	RelationVersionTypeResolution
> = async (context, data) => {
	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const versionType = toRelationSourceVersionType(data.versionType);

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
