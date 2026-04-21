import type { FieldRefResponse } from "../../services/documents-bricks/helpers/fetch-ref-data.js";
import type {
	CollectionDocument,
	Config,
	DocumentBrick,
	FieldRef,
	FieldRefParams,
	FieldTypes,
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
	LucidBrickTableName,
} from "../../types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import registeredFields, {
	registeredFieldTypes,
} from "../collection/custom-fields/registered-fields.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import formatter, {
	documentBricksFormatter,
	documentFieldsFormatter,
} from "./index.js";

const formatMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: Config;
	host: string;
	hasFields: boolean;
	hasBricks: boolean;
	refData?: FieldRefResponse;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}) => {
	return props.documents.map((d) => {
		let fields: InternalDocumentField[] | null = null;
		let bricks: InternalDocumentBrick[] | null = null;
		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
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
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}

		const refs = formatRefs({
			data: props.refData,
			collection: props.collection,
			config: props.config,
			host: props.host,
			bricksTableSchema: props.bricksTableSchema,
		});

		return formatSingle({
			document: d,
			collection: props.collection,
			config: props.config,
			fields: fields,
			bricks: bricks || undefined,
			refs: refs,
		});
	});
};

const formatSingle = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: InternalDocumentBrick[];
	fields?: InternalDocumentField[] | null;
	refs?: InternalCollectionDocument["refs"];
	config: Config;
}): InternalCollectionDocument => {
	return {
		id: props.document.id,
		collectionKey: props.document.collection_key,
		status: props.document.version_type ?? null,
		versionId: props.document.version_id ?? null,
		version: formatVersion({
			document: props.document,
			collection: props.collection,
		}),
		bricks: props.bricks ?? null,
		fields: props.fields ?? null,
		refs: props.refs ?? null,
		isDeleted: formatter.formatBoolean(props.document.is_deleted),
		createdBy: props.document.cb_user_id
			? {
					id: props.document.cb_user_id,
					email: props.document.cb_user_email ?? null,
					firstName: props.document.cb_user_first_name ?? null,
					lastName: props.document.cb_user_last_name ?? null,
					username: props.document.cb_user_username ?? null,
				}
			: null,
		updatedBy: props.document.ub_user_id
			? {
					id: props.document.ub_user_id,
					email: props.document.ub_user_email ?? null,
					firstName: props.document.ub_user_first_name ?? null,
					lastName: props.document.ub_user_last_name ?? null,
					username: props.document.ub_user_username ?? null,
				}
			: null,
		createdAt: formatter.formatDate(props.document.created_at),
		updatedAt: formatter.formatDate(props.document.updated_at),
	} satisfies InternalCollectionDocument;
};

const formatVersion = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
}): InternalCollectionDocument["version"] => {
	const versions: InternalCollectionDocument["version"] = {
		latest: null,
	};

	if (props.collection.getData.config.environments) {
		for (const env of props.collection.getData.config.environments) {
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
				createdBy: version.created_by,
			};
		}
	}

	return versions;
};

/**
 * Formats multiple documents into the client-facing document shape while
 * preserving the caller's collection-key generic at the formatter boundary.
 */
const formatClientMultiple = <TCollectionKey extends string = string>(props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: Config;
	host: string;
	hasFields: boolean;
	hasBricks: boolean;
	refData?: FieldRefResponse;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}): CollectionDocument<TCollectionKey>[] => {
	return props.documents.map((d) => {
		let fields: InternalDocumentField[] | null = null;
		let bricks: InternalDocumentBrick[] | null = null;
		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				refData: props.refData || { data: {} },
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
				collection: props.collection,
				config: props.config,
				host: props.host,
			});
		}

		const refs = formatRefs({
			data: props.refData,
			collection: props.collection,
			config: props.config,
			host: props.host,
			bricksTableSchema: props.bricksTableSchema,
		});

		return formatClientSingle<TCollectionKey>({
			document: d,
			collection: props.collection,
			config: props.config,
			fields: fields,
			bricks: bricks || undefined,
			refs: refs,
		});
	});
};

/**
 * Formats one document into the client response shape used by the public
 * client and toolkit helpers.
 */
const formatClientSingle = <TCollectionKey extends string = string>(props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: InternalDocumentBrick[];
	fields?: InternalDocumentField[] | null;
	refs?: InternalCollectionDocument["refs"];
	config: Config;
}): CollectionDocument<TCollectionKey> => {
	const res = formatSingle({
		document: props.document,
		collection: props.collection,
		bricks: props.bricks,
		fields: props.fields,
		config: props.config,
		refs: props.refs,
	});

	return {
		...res,
		bricks: res.bricks
			? res.bricks.map((b) => {
					return {
						...b,
						fields: documentFieldsFormatter.objectifyFields(b.fields),
					} satisfies DocumentBrick;
				})
			: null,
		fields: documentFieldsFormatter.objectifyFields(res.fields ?? []),
		refs: res.refs ?? null,
	} as unknown as CollectionDocument<TCollectionKey>;
};

const formatRefs = (props: {
	data?: FieldRefResponse;
	collection: CollectionBuilder;
	config: Config;
	host: string;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}): Partial<Record<FieldTypes, FieldRef[]>> | null => {
	const refs: Partial<Record<FieldTypes, FieldRef[]>> = {};
	if (!props.data) return null;

	const localization = {
		locales: props.config.localization.locales.map((l) => l.code),
		default: props.config.localization.defaultLocale,
	} satisfies FieldRefParams["localization"];

	for (const key of registeredFieldTypes) {
		const formatRef = registeredFields[key].formatRef;
		const refData = props.data.data[key];
		if (!formatRef || !refData || !Array.isArray(refData)) continue;

		const formattedRefs: FieldRef[] = [];
		for (const item of refData) {
			if (item === null || item === undefined) continue;

			const formattedRef = formatRef(item, {
				collection: props.collection,
				config: props.config,
				host: props.host,
				bricksTableSchema: props.bricksTableSchema,
				documentRefMeta: props.data?.meta?.document,
				localization: localization,
			});
			if (formattedRef === null) continue;
			formattedRefs.push(formattedRef);
		}

		refs[key] = formattedRefs;
	}

	return refs;
};

export default {
	formatMultiple,
	formatSingle,
	formatClientMultiple,
	formatClientSingle,
	formatRefs,
};
