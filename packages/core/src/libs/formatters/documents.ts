import type { FieldRefResponse } from "../../services/documents-bricks/helpers/fetch-ref-data.js";
import type {
	CollectionDocument,
	Config,
	DocumentWorkflow,
	FieldRef,
	FieldRefParams,
	FieldTypes,
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
} from "../../types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import registeredFields, {
	registeredFieldTypes,
} from "../collection/custom-fields/registered-fields.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { LucidBrickTableName } from "../db/tables/index.js";
import type { DocumentWorkflowDetailedQueryResponse } from "../repositories/document-workflows.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import documentBricksFormatter from "./document-bricks.js";
import documentFieldsFormatter from "./document-fields.js";
import formatDocumentRoute from "./document-route.js";
import documentWorkflowsFormatter from "./document-workflows.js";
import formatter from "./helpers.js";
import type { MediaFormatterOptions, MediaPosterPropsT } from "./media.js";
import mediaFormatter from "./media.js";

const formatMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
	hasFields: boolean;
	hasBricks: boolean;
	includeRefs?: boolean;
	refData?: FieldRefResponse;
	refTypes?: FieldTypes[];
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	workflows?: DocumentWorkflowDetailedQueryResponse[];
}) => {
	const workflowMap =
		props.workflows !== undefined
			? new Map(
					props.workflows.map((workflow) => [workflow.document_id, workflow]),
				)
			: undefined;

	const hydratedRefs = formatRefs({
		data: props.refData,
		collection: props.collection,
		collections: props.collections,
		config: props.config,
		host: props.host,
		mediaOptions: props.mediaOptions,
		bricksTableSchema: props.bricksTableSchema,
	});
	const refs = filterRefs(hydratedRefs, props.refTypes);

	return props.documents.map((d) => {
		let fields: InternalDocumentField[] | null = null;
		let bricks: InternalDocumentBrick[] | null = null;

		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
				refs: hydratedRefs,
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}
		if (props.hasBricks) {
			bricks = documentBricksFormatter.formatMultiple({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
				refs: hydratedRefs,
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
			refs: props.includeRefs === false ? null : refs,
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

const formatDocumentAuthor = (props: {
	id?: number | null;
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	username?: string | null;
	profilePicture?: MediaPosterPropsT[];
	mediaOptions: MediaFormatterOptions;
}): InternalCollectionDocument["createdBy"] => {
	if (!props.id) return null;

	return {
		id: props.id,
		email: props.email ?? null,
		firstName: props.firstName ?? null,
		lastName: props.lastName ?? null,
		username: props.username ?? null,
		profilePicture: mediaFormatter.formatMediaImagePreview({
			poster: props.profilePicture?.[0],
			options: props.mediaOptions,
		}),
	};
};

const formatSingle = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: InternalDocumentBrick[];
	fields?: InternalDocumentField[] | null;
	refs?: InternalCollectionDocument["refs"];
	workflow?: DocumentWorkflow | null;
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
}): InternalCollectionDocument => {
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
			locales: props.config.localization.locales.map((locale) => locale.code),
		}),
		versions: formatVersions({
			document: props.document,
			collection: props.collection,
		}),
		bricks: props.bricks ?? null,
		fields: props.fields ?? null,
		refs: props.refs ?? null,
		workflow:
			props.workflow !== undefined
				? props.workflow
				: (inlineWorkflow ??
					documentWorkflowsFormatter.formatSummary({
						collection: props.collection,
						stageKey: props.document.workflow_stage_key,
					})),
		isDeleted: formatter.formatBoolean(props.document.is_deleted),
		createdBy: formatDocumentAuthor({
			id: props.document.cb_user_id,
			email: props.document.cb_user_email,
			firstName: props.document.cb_user_first_name,
			lastName: props.document.cb_user_last_name,
			username: props.document.cb_user_username,
			profilePicture: props.document.cb_user_profile_picture,
			mediaOptions: props.mediaOptions,
		}),
		updatedBy: formatDocumentAuthor({
			id: props.document.ub_user_id,
			email: props.document.ub_user_email,
			firstName: props.document.ub_user_first_name,
			lastName: props.document.ub_user_last_name,
			username: props.document.ub_user_username,
			profilePicture: props.document.ub_user_profile_picture,
			mediaOptions: props.mediaOptions,
		}),
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
const formatContentMultiple = <TCollectionKey extends string = string>(props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
	hasFields: boolean;
	hasBricks: boolean;
	refData?: FieldRefResponse;
	refTypes?: FieldTypes[];
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	include: {
		bricks: boolean;
		refs: boolean;
		meta: boolean;
	};
}): CollectionDocument<TCollectionKey>[] => {
	const hydratedRefs = formatRefs({
		data: props.refData,
		collection: props.collection,
		collections: props.collections,
		config: props.config,
		host: props.host,
		mediaOptions: props.mediaOptions,
		bricksTableSchema: props.bricksTableSchema,
		flattenRelationRefFields: true,
	});
	const refs = filterRefs(hydratedRefs, props.refTypes);

	return props.documents.map((d) => {
		let fields: InternalDocumentField[] | null = null;
		let bricks: InternalDocumentBrick[] | null = null;
		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
				refs: hydratedRefs,
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}
		if (props.hasBricks) {
			bricks = documentBricksFormatter.formatMultiple({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
				refs: hydratedRefs,
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}

		return formatContentSingle<TCollectionKey>({
			document: d,
			collection: props.collection,
			config: props.config,
			fields: fields,
			bricks: bricks || undefined,
			refs: props.include.refs ? refs : null,
			host: props.host,
			include: props.include,
		});
	});
};

const formatContentMeta = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
}) => {
	return {
		versionId: props.document.version_id ?? null,
		versions: formatVersions({
			document: props.document,
			collection: props.collection,
		}),
		createdAt: formatter.formatDate(props.document.created_at),
		updatedAt: formatter.formatDate(props.document.updated_at),
		createdBy: props.document.created_by ?? null,
		updatedBy: props.document.updated_by ?? null,
	};
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
const formatContentSingle = <TCollectionKey extends string = string>(props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: InternalDocumentBrick[];
	fields?: InternalDocumentField[] | null;
	refs?: InternalCollectionDocument["refs"];
	config: Config;
	host: string;
	include: {
		bricks: boolean;
		refs: boolean;
		meta: boolean;
	};
}): CollectionDocument<TCollectionKey> => {
	const contentRes: Record<string, unknown> = {
		id: props.document.id,
		collectionKey: props.document.collection_key,
		version: props.document.version_type ?? null,
		route: formatDocumentRoute({
			collection: props.collection,
			documentId: props.document.id,
			fields: props.fields,
			locales: props.config.localization.locales.map((locale) => locale.code),
		}),
		fields: documentFieldsFormatter.flattenFields(
			props.fields ?? [],
			props.collection.contentFieldTree,
		),
	};

	if (props.include.bricks) {
		contentRes.bricks = formatContentBricks(props.bricks, props.collection);
	}

	if (props.include.refs) {
		contentRes.refs = props.refs ?? {};
	}

	if (props.include.meta) {
		contentRes.meta = formatContentMeta({
			document: props.document,
			collection: props.collection,
		});
	}

	return contentRes as unknown as CollectionDocument<TCollectionKey>;
};

const formatRefs = (props: {
	data?: FieldRefResponse;
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	config: Config;
	host: string;
	mediaOptions: MediaFormatterOptions;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	fieldTypes?: FieldTypes[];
	flattenRelationRefFields?: boolean;
}): Partial<Record<FieldTypes | string, FieldRef[]>> | null => {
	const refs: Partial<Record<FieldTypes | string, FieldRef[]>> = {};
	if (!props.data) return null;

	const localization = {
		locales: props.config.localization.locales.map((l) => l.code),
		default: props.config.localization.defaultLocale,
	} satisfies FieldRefParams["localization"];

	for (const key of props.fieldTypes ?? registeredFieldTypes) {
		const formatRef = registeredFields[key].formatRef;
		const refData = props.data.data[key];
		if (!formatRef || !refData || !Array.isArray(refData)) continue;

		const formattedRefs: FieldRef[] = [];
		for (const item of refData) {
			if (item === null || item === undefined) continue;

			const formattedRef = formatRef(item, {
				collection: props.collection,
				collections: props.collections,
				config: props.config,
				host: props.host,
				mediaDelivery: props.mediaOptions.delivery,
				bricksTableSchema: props.bricksTableSchema,
				relationRefMeta: props.data?.meta?.relation,
				flattenRelationRefFields: props.flattenRelationRefFields,
				localization: localization,
			});
			if (formattedRef === null) continue;
			formattedRefs.push(formattedRef);
		}

		refs[key] = formattedRefs;
	}

	return refs;
};

/** Limits an already-formatted refs object to explicitly requested types. */
const filterRefs = (
	refs: InternalCollectionDocument["refs"],
	fieldTypes?: FieldTypes[],
): InternalCollectionDocument["refs"] => {
	if (!refs || fieldTypes === undefined) return refs;

	return Object.fromEntries(
		fieldTypes.flatMap((fieldType) => {
			const values = refs[fieldType];
			return values ? [[fieldType, values]] : [];
		}),
	);
};

export default {
	formatMultiple,
	formatSingle,
	formatContentMultiple,
	formatContentSingle,
	formatRefs,
	filterRefs,
};
