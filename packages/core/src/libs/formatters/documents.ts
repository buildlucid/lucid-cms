import constants from "../../constants/constants.js";
import type {
	CollectionDocument,
	DocumentBrick,
	DocumentWorkflow,
	FieldConfig,
	FieldTypes,
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
	LocalizationConfig,
	RefResourceMap,
	Refs,
	ResolvedLucidConfig,
	UserRef,
} from "../../exports/types.js";
import { resolveRelatedDocumentVersionType } from "../../services/documents/helpers/resolve-relation-version-type.js";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../collection/builders/field-builder/index.js";
import type { CustomFieldContentFormatContext } from "../collection/custom-fields/types.js";
import mapContentFields from "../collection/helpers/map-content-fields.js";
import resolveCollectionLocale from "../collection/helpers/resolve-collection-locale.js";
import resolveCollectionLocalization, {
	isCollectionFieldLocalized,
} from "../collection/helpers/resolve-collection-localization.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
} from "../db/tables/index.js";
import type { DocumentWorkflowDetailedQueryResponse } from "../repositories/document-workflows.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import documentBricksFormatter from "./document-bricks.js";
import documentFieldsFormatter from "./document-fields.js";
import formatDocumentRoute, {
	localizeDocumentRoute,
} from "./document-route.js";
import documentWorkflowsFormatter from "./document-workflows.js";
import formatter, { type ContentReadLocale } from "./helpers.js";
import mediaFormatter, { type MediaFormatterOptions } from "./media.js";

const formatMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: ResolvedLucidConfig;
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
	config: ResolvedLucidConfig;
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
		contentId: props.document.version_content_id ?? null,
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
			props.document.version_type !== "latest" &&
			props.document.version_type !==
				constants.collectionBuilder.publishing.proposalVersionType
				? null
				: props.workflow !== undefined
					? props.workflow
					: (inlineWorkflow ??
						documentWorkflowsFormatter.formatSummary({
							collection: props.collection,
							stageKey: props.document.workflow_stage_key,
						})),
		isDeleted: formatter.formatBoolean(props.document.is_deleted),
		createRequestId: props.document.create_request_id ?? null,
		createdBy: props.document.created_by ?? null,
		createdByRunId: props.document.created_by_run_id ?? null,
		updatedBy: props.document.updated_by ?? null,
		updatedByRunId: props.document.updated_by_run_id ?? null,
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
	if (props.collection.getData.publishing.environments) {
		for (const environment of props.collection.getData.publishing
			.environments) {
			versions[environment.key] = null;
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
				createdByRunId: version.created_by_run_id ?? null,
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
						createdByRunId: props.document.createdByRunId,
						updatedByRunId: props.document.updatedByRunId,
					},
				}
			: undefined),
	} satisfies CollectionDocument<string> as CollectionDocument<TCollectionKey>;
};

/** What a content read asks for: one locale and its fallback, or every translation, and how many relation levels to fill in. */
type ContentRead = {
	locale: string | null;
	fallbackLocale: string | null;
	depth: number;
};

type Brick = DocumentBrick & { id: number };

/** A related document a content read fills in, with the version it was read in. */
export type ContentRelatedRef = RefResourceMap["documents"] & {
	version: DocumentVersionType;
};

/** A content read's refs, retaining related-document versions because sources can map collections to different versions. */
export type ContentReadRefs = Omit<Refs, "documents"> & {
	documents?: ContentRelatedRef[];
};

/** The document whose fields are being filled in, and the version it was read in, which its relations follow. */
type FillSource = {
	collection: CollectionBuilder;
	version: DocumentVersionType;
};

type FillContext = {
	/** References as stored, which rich text reads its linked text from. */
	refs: ContentReadRefs;
	collections: CollectionBuilder[];
	localization: LocalizationConfig;
	read: ContentRead;
	media: Map<number, unknown>;
	users: Map<number, unknown>;
	emails: Map<number, unknown>;
	documents: Map<string, ContentRelatedRef>;
};

/** The read document's embedded bricks, which its rich text fills in. */
type Embedded = {
	bricks: Brick[];
	brick: (brick: Brick) => unknown;
};

const documentKey = (collectionKey: unknown, id: unknown, version: unknown) =>
	`${collectionKey}:${id}:${version}`;

/** The version a source's related document in a collection is read in. */
const relatedVersion = (
	source: FillSource,
	collectionKey: unknown,
	context: FillContext,
) =>
	resolveRelatedDocumentVersionType({
		collections: context.collections,
		sourceCollectionKey: source.collection.key,
		sourceVersionType: source.version,
		targetCollectionKey: String(collectionKey),
	});

/** Resolves a collection's supported read and fallback locales, defaulting unsupported read locales and accepting per-translation overrides. */
const collectionRead = (
	collection: CollectionBuilder,
	context: FillContext,
	{
		locale,
		fallbackLocale,
	}: Pick<ContentRead, "locale" | "fallbackLocale"> = context.read,
) => {
	const localization = resolveCollectionLocalization({
		localization: context.localization,
		collection,
	});
	const read: ContentReadLocale | null =
		locale === null || !localization.enabled
			? null
			: {
					locale: resolveCollectionLocale(localization, locale) ?? locale,
					fallbackLocale:
						fallbackLocale && localization.locales.includes(fallbackLocale)
							? fallbackLocale
							: null,
				};
	return { localization, read };
};

/** Fills in a document's or brick's fields through their custom fields, picking translations in the read's locale. */
const fillFields = (
	fields: Record<string, unknown>,
	builder: CollectionBuilder | BrickBuilder,
	source: FillSource,
	level: number,
	context: FillContext,
	embedded: Embedded | null,
) => {
	const { localization, read } = collectionRead(source.collection, context);
	//* Rich text reads the related documents in the versions this source reads them in.
	const refs = {
		...context.refs,
		documents: context.refs.documents?.filter(
			(document) =>
				document.version ===
				relatedVersion(source, document.collectionKey, context),
		),
	};
	//* Referenced text, such as media alt text, is in the read's locale even when this collection doesn't have it.
	const referenceRead: ContentReadLocale | null =
		context.read.locale === null
			? null
			: {
					locale: context.read.locale,
					fallbackLocale: context.read.fallbackLocale,
				};
	const instances = getFieldBuilderState(builder).fields;
	const fieldContext = (
		valueRead: ContentReadLocale | null,
	): CustomFieldContentFormatContext => ({
		locale: valueRead?.locale ?? null,
		fallbackLocale: valueRead?.fallbackLocale ?? null,
		documentLocale: valueRead
			? (collectionKey) => {
					const target = context.collections.find(
						(item) => item.key === collectionKey,
					);
					const targetRead = target
						? collectionRead(target, context, valueRead).read
						: null;
					return targetRead ?? valueRead;
				}
			: null,
		refs,
		media: (id) => context.media.get(id),
		user: (id) => context.users.get(id),
		email: (id) => context.emails.get(id),
		document: (collectionKey, id) =>
			relatedDocument(collectionKey, id, level, context, source),
		brick: embedded
			? (ref) => {
					const brick = embedded.bricks.find(
						(item) => item.type === "embedded" && item.ref === ref,
					);
					return brick ? embedded.brick(brick) : null;
				}
			: null,
	});
	const fill = (
		value: unknown,
		config: FieldConfig<FieldTypes>,
		valueRead: ContentReadLocale | null,
	) => {
		const instance = instances.get(config.key);
		return instance
			? instance.formatContentValue(value, fieldContext(valueRead))
			: value;
	};

	return mapContentFields(fields, builder.contentFieldTree, {
		// Translations are picked or filled here, so the walk hands over the whole map.
		translated: () => false,
		map: (value, config) => {
			if (
				!isCollectionFieldLocalized(localization, { config }) ||
				!isPlainObject(value)
			) {
				return fill(value, config, referenceRead);
			}
			if (read) {
				const instance = instances.get(config.key);
				return fill(
					formatter.pickTranslation(
						value,
						read,
						instance && ((translation) => instance.isEmpty(translation)),
					),
					config,
					referenceRead,
				);
			}
			return Object.fromEntries(
				Object.entries(value).map(([code, translation]) => [
					code,
					fill(translation, config, { locale: code, fallbackLocale: null }),
				]),
			);
		},
	});
};

/** Resolves a related document through `depth`, returns its ID and collection beyond it, and returns null for unreadable targets within depth. */
const relatedDocument = (
	collectionKey: unknown,
	id: unknown,
	level: number,
	context: FillContext,
	source: FillSource,
): Record<string, unknown> | null => {
	if (level > context.read.depth) return { id, collectionKey };

	const document = context.documents.get(
		documentKey(
			collectionKey,
			id,
			relatedVersion(source, collectionKey, context),
		),
	);
	const collection = context.collections.find(
		(item) => item.key === collectionKey,
	);
	if (!document || !collection) return null;

	const { localization, read } = collectionRead(collection, context);
	return {
		id: document.id,
		collectionKey: document.collectionKey,
		...(context.read.locale !== null ? { locale: read?.locale ?? null } : {}),
		route:
			context.read.locale !== null
				? localizeDocumentRoute(document.route, read, localization.locales)
				: document.route,
		fields: document.fields
			? fillFields(
					document.fields,
					collection,
					{ collection, version: document.version },
					level + 1,
					context,
					null,
				)
			: null,
	};
};

const fillUser = (id: number | null | undefined, context: FillContext) =>
	(id === null || id === undefined ? null : context.users.get(id)) ?? null;

/** Gives meta its users, leaving out the agent runs only the admin shows. */
const fillMeta = (
	meta: NonNullable<CollectionDocument["meta"]>,
	context: FillContext,
) => ({
	versionId: meta.versionId,
	versions: Object.fromEntries(
		Object.entries(meta.versions).map(([key, version]) => {
			if (!version) return [key, null];
			const { createdBy, createdByRunId: _runId, ...summary } = version;
			return [key, { ...summary, createdBy: fillUser(createdBy, context) }];
		}),
	),
	createdAt: meta.createdAt,
	updatedAt: meta.updatedAt,
	createdBy: fillUser(meta.createdBy, context),
	updatedBy: fillUser(meta.updatedBy, context),
});

/** Builds content responses with hydrated media and users, relations through `depth`, ordered builder bricks, keyed fixed bricks and rich text targets, optionally localizing fields, routes and media text with fallback translations. */
const formatContentRead = (props: {
	document: CollectionDocument;
	refs: ContentReadRefs;
	collection: CollectionBuilder;
	collections: CollectionBuilder[];
	localization: LocalizationConfig;
	read: ContentRead;
}) => {
	const { document, collection, read } = props;
	const mediaRead: ContentReadLocale | null =
		read.locale === null
			? null
			: { locale: read.locale, fallbackLocale: read.fallbackLocale };
	const users = (props.refs.users ?? []).map((user: NonNullable<UserRef>) =>
		mediaRead && user.profilePicture
			? {
					...user,
					profilePicture: mediaFormatter.localizeMedia(
						user.profilePicture,
						mediaRead,
					),
				}
			: user,
	);
	const context: FillContext = {
		refs: props.refs,
		collections: props.collections,
		localization: props.localization,
		read,
		media: new Map(
			(props.refs.media ?? []).map((item) => [
				item.id,
				mediaRead ? mediaFormatter.localizeMedia(item, mediaRead) : item,
			]),
		),
		users: new Map(users.map((user) => [user.id, user])),
		emails: new Map(
			(props.refs.emails ?? []).map((email) => [email.id, email]),
		),
		documents: new Map(
			(props.refs.documents ?? []).map((item) => [
				documentKey(item.collectionKey, item.id, item.version),
				item,
			]),
		),
	};
	const source: FillSource = {
		collection,
		version: document.version ?? "latest",
	};
	const bricks = (document.bricks ?? []) as Brick[];
	const fillBrick = (brick: Brick): unknown => {
		const builder = collection.brickInstances.find(
			(item) => item.key === brick.key,
		);
		return {
			id: brick.id,
			key: brick.key,
			order: brick.order,
			fields: builder
				? fillFields(brick.fields, builder, source, 1, context, embedded)
				: brick.fields,
		};
	};
	const embedded: Embedded = { bricks, brick: fillBrick };
	const { localization, read: documentRead } = collectionRead(
		collection,
		context,
	);

	return {
		id: document.id,
		collectionKey: document.collectionKey,
		version: document.version,
		...(read.locale !== null ? { locale: documentRead?.locale ?? null } : {}),
		route:
			read.locale !== null
				? localizeDocumentRoute(
						document.route,
						documentRead,
						localization.locales,
					)
				: document.route,
		fields: fillFields(
			document.fields,
			collection,
			source,
			1,
			context,
			embedded,
		),
		...(document.bricks
			? {
					bricks: bricks
						.filter((brick) => brick.type === "builder")
						.map(fillBrick),
					fixed: Object.fromEntries(
						bricks
							.filter((brick) => brick.type === "fixed")
							.map((brick) => [brick.key, fillBrick(brick)]),
					),
				}
			: {}),
		...(document.meta ? { meta: fillMeta(document.meta, context) } : {}),
	};
};

export default {
	formatMultiple,
	formatSingle,
	formatContentMultiple,
	formatContentSingle,
	formatContentRead,
};
