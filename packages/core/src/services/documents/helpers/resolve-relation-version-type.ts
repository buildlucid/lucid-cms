import constants from "../../../constants/constants.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { FieldRefVersionTypeResolver } from "../../../libs/collection/custom-fields/utils/ref-fetch.js";
import { DocumentPublishOperationsRepository } from "../../../libs/repositories/index.js";
import type { Config, DocumentVersionType } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

type RelationVersionType = Exclude<DocumentVersionType, "revision">;

type RelationVersionTypeResolution = {
	versionType: RelationVersionType;
	resolveVersionType?: FieldRefVersionTypeResolver;
};

const latestRelationVersionType = "latest" satisfies RelationVersionType;
const snapshotVersionType =
	constants.collectionBuilder.publishing.snapshotVersionType;

const findCollection = (config: Config, collectionKey: string) => {
	return config.collections?.find(
		(collection) => collection.key === collectionKey,
	);
};

const findEnvironment = (
	collection: CollectionBuilder | undefined,
	versionType: RelationVersionType,
) => {
	return collection?.getData.environments.find(
		(environment) => environment.key === versionType,
	);
};

const resolveDocumentRelationVersionType = (props: {
	config: Config;
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
	targetCollectionKey?: string;
}) => {
	if (
		props.targetCollectionKey === undefined ||
		props.sourceVersionType === latestRelationVersionType
	) {
		return props.sourceVersionType;
	}

	const sourceCollection = findCollection(
		props.config,
		props.sourceCollectionKey,
	);
	const sourceEnvironment = findEnvironment(
		sourceCollection,
		props.sourceVersionType,
	);
	if (!sourceEnvironment) return props.sourceVersionType;

	const mappedVersionType =
		sourceEnvironment.relations?.[props.targetCollectionKey];
	if (mappedVersionType) return mappedVersionType;

	const targetCollection = findCollection(
		props.config,
		props.targetCollectionKey,
	);
	const targetEnvironment = findEnvironment(
		targetCollection,
		props.sourceVersionType,
	);

	return targetEnvironment
		? props.sourceVersionType
		: latestRelationVersionType;
};

const createRelationVersionTypeResolver = (props: {
	config: Config;
	sourceCollectionKey: string;
	sourceVersionType: RelationVersionType;
}): FieldRefVersionTypeResolver => {
	return (input) => {
		if (input.fieldType !== "relation") return props.sourceVersionType;

		return resolveDocumentRelationVersionType({
			config: props.config,
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
 * the historical document body but still preview refs from latest, and snapshots
 * hydrate against the target of their publish operation so scheduled-release UI
 * reflects what will be released. Orphan snapshots fall back to latest to keep
 * old snapshot reads working.
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
	if (data.versionType === "revision") {
		return {
			error: undefined,
			data: {
				versionType: latestRelationVersionType,
				resolveVersionType: createRelationVersionTypeResolver({
					config: context.config,
					sourceCollectionKey: data.collectionKey,
					sourceVersionType: latestRelationVersionType,
				}),
			},
		};
	}

	if (data.versionType !== snapshotVersionType) {
		return {
			error: undefined,
			data: {
				versionType: data.versionType,
				resolveVersionType: createRelationVersionTypeResolver({
					config: context.config,
					sourceCollectionKey: data.collectionKey,
					sourceVersionType: data.versionType,
				}),
			},
		};
	}

	if (data.versionId === undefined) {
		return {
			error: undefined,
			data: {
				versionType: latestRelationVersionType,
				resolveVersionType: createRelationVersionTypeResolver({
					config: context.config,
					sourceCollectionKey: data.collectionKey,
					sourceVersionType: latestRelationVersionType,
				}),
			},
		};
	}

	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const operationRes = await Operations.selectSingle({
		select: ["target"],
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			...(data.documentId === undefined
				? []
				: [
						{
							key: "document_id" as const,
							operator: "=" as const,
							value: data.documentId,
						},
					]),
			{ key: "snapshot_version_id", operator: "=", value: data.versionId },
		],
	});
	if (operationRes.error) return operationRes;

	const target = operationRes.data?.target ?? latestRelationVersionType;

	return {
		error: undefined,
		data: {
			versionType: target,
			resolveVersionType: createRelationVersionTypeResolver({
				config: context.config,
				sourceCollectionKey: data.collectionKey,
				sourceVersionType: target,
			}),
		},
	};
};

export default resolveRelationVersionType;
