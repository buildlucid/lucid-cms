import type {
	CollectionDocument,
	Config,
	DocumentWorkflow,
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
	Refs,
} from "../../exports/types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import resolveCollectionLocalization from "../collection/helpers/resolve-collection-localization.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { LucidBrickTableName } from "../db/tables/index.js";
import type { DocumentWorkflowDetailedQueryResponse } from "../repositories/document-workflows.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import documentBricksFormatter from "./document-bricks.js";
import documentFieldsFormatter from "./document-fields.js";
import formatDocumentRoute from "./document-route.js";
import documentWorkflowsFormatter from "./document-workflows.js";
import formatter from "./helpers.js";
import type { MediaFormatterOptions } from "./media.js";

const formatMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
	hasFields: boolean;
	hasBricks: boolean;
	hydratedRefs: Refs;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	workflows?: DocumentWorkflowDetailedQueryResponse[];
}) => {
	const workflowMap =
		props.workflows !== undefined
			? new Map(
					props.workflows.map((workflow) => [workflow.document_id, workflow]),
				)
			: undefined;

	return props.documents.map((d) => {
		let fields: InternalDocumentField[] | null = null;
		let bricks: InternalDocumentBrick[] | null = null;

		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refs: props.hydratedRefs,
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}
		if (props.hasBricks) {
			bricks = documentBricksFormatter.formatMultiple({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refs: props.hydratedRefs,
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}

		return formatSingle({
			document: d,
			collection: props.collection,
			config: props.config,
			fields: fields,
			bricks: bricks || undefined,
			workflow:
				workflowMap !== undefined
					? documentWorkflowsFormatter.formatSingle({
							collection: props.collection,
							workflow: workflowMap.get(d.id),
							mediaOptions: props.mediaOptions,
						})
					: undefined,
			host: props.host,
			mediaOptions: props.mediaOptions,
		});
	});
};

const formatSingle = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: InternalDocumentBrick[];
	fields?: InternalDocumentField[] | null;
	workflow?: DocumentWorkflow | null;
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
}): InternalCollectionDocument => {
	const localization = resolveCollectionLocalization({
		localization: props.config.localization,
		collection: props.collection,
	});

	const inlineWorkflow =
		props.document.workflow_assignees !== undefined
			? documentWorkflowsFormatter.formatSingle({
					collection: props.collection,
					workflow: {
						id: props.document.workflow_id,
						collection_key: props.document.collection_key,
						document_id: props.document.id,
						stage_key: props.document.workflow_stage_key,
						created_by: props.document.workflow_created_by,
						created_at: props.document.workflow_created_at,
						updated_by: props.document.workflow_updated_by,
						updated_at: props.document.workflow_updated_at,
						assignees: props.document.workflow_assignees,
					},
					mediaOptions: props.mediaOptions,
				})
			: undefined;

	return {
		id: props.document.id,
		collectionKey: props.document.collection_key,
		version: props.document.version_type ?? null,
		versionId: props.document.version_id ?? null,
		route: formatDocumentRoute({
			collection: props.collection,
			documentId: props.document.id,
			fields: props.fields,
			locales: localization.locales,
		}),
		versions: formatVersions({
			document: props.document,
			collection: props.collection,
		}),
		bricks: props.bricks ?? null,
		fields: props.fields ?? null,
		workflow:
			props.workflow !== undefined
				? props.workflow
				: (inlineWorkflow ??
					documentWorkflowsFormatter.formatSummary({
						collection: props.collection,
						stageKey: props.document.workflow_stage_key,
					})),
		isDeleted: formatter.formatBoolean(props.document.is_deleted),
		createdBy: props.document.created_by ?? null,
		updatedBy: props.document.updated_by ?? null,
		createdAt: formatter.formatDate(props.document.created_at),
		updatedAt: formatter.formatDate(props.document.updated_at),
	} satisfies InternalCollectionDocument;
};

const formatVersions = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
}): InternalCollectionDocument["versions"] => {
	const versions: InternalCollectionDocument["versions"] = {
		latest: null,
	};

	if (props.collection.getData.environments) {
		for (const env of props.collection.getData.environments) {
			versions[env.key] = null;
		}
	}

	if (props.document.versions) {
		for (const version of props.document.versions) {
			versions[version.type] = {
				id: version.id,
				promotedFrom: version.promoted_from,
				contentId: version.content_id,
				createdAt: formatter.formatDate(version.created_at),
				updatedAt: formatter.formatDate(version.updated_at),
				createdBy: version.created_by,
			};
		}
	}

	return versions;
};

/**
 * Formats multiple documents into the content-facing document shape while
 * preserving the caller's collection-key generic at the formatter boundary.
 */
const formatContentMultiple = <TCollectionKey extends string>(props: {
	documents: InternalCollectionDocument[];
	collectionKey: TCollectionKey;
	collection: CollectionBuilder;
	include: {
		bricks: boolean;
		meta: boolean;
	};
}): CollectionDocument<TCollectionKey>[] => {
	return props.documents.map((document) =>
		formatContentSingle({
			document,
			collectionKey: props.collectionKey,
			collection: props.collection,
			include: props.include,
		}),
	);
};

const formatContentBricks = (
	bricks: InternalDocumentBrick[] | null | undefined,
	collection: CollectionBuilder,
) => {
	return (bricks ?? []).map((brick) => {
		const brickInstance = collection.brickInstances.find(
			(b) => b.key === brick.key,
		);

		return {
			id: brick.id,
			ref: brick.ref,
			key: brick.key,
			type: brick.type,
			order: brick.order,
			fields: documentFieldsFormatter.flattenFields(
				brick.fields,
				brickInstance?.contentFieldTree,
			),
		};
	});
};

/**
 * Formats one document into the content response shape used by the public
 * client package and toolkit helpers.
 */
const formatContentSingle = <TCollectionKey extends string>(props: {
	document: InternalCollectionDocument;
	collectionKey: TCollectionKey;
	collection: CollectionBuilder;
	include: {
		bricks: boolean;
		meta: boolean;
	};
}): CollectionDocument<TCollectionKey> => {
	return {
		id: props.document.id,
		collectionKey: props.collectionKey,
		version: props.document.version,
		route: props.document.route,
		fields: documentFieldsFormatter.flattenFields(
			props.document.fields ?? [],
			props.collection.contentFieldTree,
		),
		...(props.include.bricks
			? {
					bricks: formatContentBricks(props.document.bricks, props.collection),
				}
			: undefined),
		...(props.include.meta
			? {
					meta: {
						versionId: props.document.versionId,
						versions: props.document.versions,
						createdAt: props.document.createdAt,
						updatedAt: props.document.updatedAt,
						createdBy: props.document.createdBy,
						updatedBy: props.document.updatedBy,
					},
				}
			: undefined),
	} satisfies CollectionDocument<string> as CollectionDocument<TCollectionKey>;
};

export default {
	formatMultiple,
	formatSingle,
	formatContentMultiple,
	formatContentSingle,
};
