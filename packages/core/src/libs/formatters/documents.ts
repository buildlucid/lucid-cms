import formatter from "./index.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type {
	Config,
	DocumentResponse,
	BrickResponse,
	FieldResponse,
	ClientDocumentResponse,
	BrickAltResponse,
	LucidBrickTableName,
	FieldTypes,
	FieldRefs,
	FieldRefParams,
} from "../../types.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import { documentBricksFormatter, documentFieldsFormatter } from "./index.js";
import customFieldMap from "../custom-fields/custom-field-map.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { MediaPropsT } from "./media.js";
import type { UserPropT } from "./users.js";

const formatMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: Config;
	hasFields: boolean;
	hasBricks: boolean;
	relationData?: FieldRelationResponse;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}) => {
	return props.documents.map((d) => {
		let fields: FieldResponse[] | null = null;
		let bricks: BrickResponse[] | null = null;
		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				relationMetaData: props.relationData || {},
				collection: props.collection,
				config: props.config,
			});
		}
		if (props.hasBricks) {
			bricks = documentBricksFormatter.formatMultiple({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				relationMetaData: props.relationData || {},
				collection: props.collection,
				config: props.config,
			});
		}

		const refs = formatRefs({
			data: props.relationData,
			collection: props.collection,
			config: props.config,
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
	bricks?: BrickResponse[];
	fields?: FieldResponse[] | null;
	refs?: DocumentResponse["refs"];
	config: Config;
}): DocumentResponse => {
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
	} satisfies DocumentResponse;
};

const formatVersion = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
}): DocumentResponse["version"] => {
	const versions: DocumentResponse["version"] = {
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
				createdAt: formatter.formatDate(version.created_at),
				createdBy: version.created_by,
			};
		}
	}

	return versions;
};

const formatClientMultiple = (props: {
	documents: DocumentQueryResponse[];
	collection: CollectionBuilder;
	config: Config;
	hasFields: boolean;
	hasBricks: boolean;
	relationData?: FieldRelationResponse;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}): ClientDocumentResponse[] => {
	return props.documents.map((d) => {
		let fields: FieldResponse[] | null = null;
		let bricks: BrickResponse[] | null = null;
		if (props.hasFields) {
			fields = documentBricksFormatter.formatDocumentFields({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				relationMetaData: props.relationData || {},
				collection: props.collection,
				config: props.config,
			});
		}
		if (props.hasBricks) {
			bricks = documentBricksFormatter.formatMultiple({
				bricksQuery: d,
				bricksSchema: props.bricksTableSchema,
				relationMetaData: props.relationData || {},
				collection: props.collection,
				config: props.config,
			});
		}

		const refs = formatRefs({
			data: props.relationData,
			collection: props.collection,
			config: props.config,
			bricksTableSchema: props.bricksTableSchema,
		});

		return formatClientSingle({
			document: d,
			collection: props.collection,
			config: props.config,
			fields: fields,
			bricks: bricks || undefined,
			refs: refs,
		});
	});
};

const formatClientSingle = (props: {
	document: DocumentQueryResponse;
	collection: CollectionBuilder;
	bricks?: BrickResponse[];
	fields?: FieldResponse[] | null;
	refs?: DocumentResponse["refs"];
	config: Config;
}): ClientDocumentResponse => {
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
					} satisfies BrickAltResponse;
				})
			: null,
		fields: res.fields
			? documentFieldsFormatter.objectifyFields(res.fields)
			: null,
		refs: res.refs ?? null,
	} satisfies ClientDocumentResponse;
};

const formatRefs = (props: {
	data?: FieldRelationResponse;
	collection: CollectionBuilder;
	config: Config;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}): Partial<Record<FieldTypes, FieldRefs[]>> | null => {
	const refs: Partial<Record<FieldTypes, FieldRefs[]>> = {};
	if (!props.data) return null;

	const localization = {
		locales: props.config.localization.locales.map((l) => l.code),
		default: props.config.localization.defaultLocale,
	} satisfies FieldRefParams["localization"];

	for (const [type, data] of Object.entries(props.data)) {
		const key = type as FieldTypes;
		const customField = customFieldMap[key];
		if (!customField) continue;

		refs[key] = data
			.map((d) => {
				if (d === null || d === undefined) return null;
				// @ts-expect-error
				return customField.formatRef(d, {
					collection: props.collection,
					config: props.config,
					bricksTableSchema: props.bricksTableSchema,
					localization: localization,
				});
			})
			.filter((d) => d !== null);
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
