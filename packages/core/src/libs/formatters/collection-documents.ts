import type {
	BrickResponse,
	FieldResponse,
	CollectionDocumentResponse,
	ClientDocumentResponse,
	BrickAltResponse,
} from "../../types/response.js";
import CollectionDocumentFieldsFormatterClass, {
	type FieldProp,
} from "./collection-document-fields.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import Formatter from "./index.js";
import CollectionDocumentBricksFormatter, {
	type GroupProp,
} from "./collection-document-bricks.js";
import type { Config } from "../../exports/types.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

interface DocumentPropT {
	id: number;
	collection_key: string | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	// Created by user join
	cb_user_id?: number | null;
	cb_user_email?: string | null;
	cb_user_first_name?: string | null;
	cb_user_last_name?: string | null;
	cb_user_username?: string | null;
	// Updated by user join
	ub_user_id?: number | null;
	ub_user_email?: string | null;
	ub_user_first_name?: string | null;
	ub_user_last_name?: string | null;
	ub_user_username?: string | null;
	// Target Version
	version_id?: number | null;
	version_type?: DocumentVersionType | null;
	version_promoted_from?: number | null;
	version_created_at?: Date | string | null;
	version_created_by?: number | null;
	// Versions
	versions?: Array<{
		id: number | null;
		version_type: DocumentVersionType | null;
		promoted_from: number | null;
		created_at: Date | string | null;
		created_by: number | null;
	}>;
	fields?: FieldProp[];
	groups?: GroupProp[];
}

export default class CollectionDocumentsFormatter {
	formatMultiple = (props: {
		documents: DocumentPropT[];
		collection: CollectionBuilder;
		config: Config;
	}) => {
		return props.documents.map((d) =>
			this.formatSingle({
				document: d,
				collection: props.collection,
				config: props.config,
			}),
		);
	};
	formatSingle = (props: {
		document: DocumentPropT;
		collection: CollectionBuilder;
		bricks?: BrickResponse[];
		fields?: FieldResponse[] | null;
		config: Config;
	}) => {
		let fields: FieldResponse[] | null = props.fields ?? null;
		const FieldsFormatter = Formatter.get("collection-document-fields");

		if (fields === null && props.document.fields) {
			if (props.document.groups) {
				// ** Standard format for fields - nested as we have access to the groups
				fields = FieldsFormatter.formatMultiple(
					{
						fields: props.document.fields,
						groups: props.document.groups,
					},
					{
						host: props.config.host,
						builder: props.collection,
						collectionTranslations:
							props.collection.getData.config.useTranslations,
						localisation: {
							locales: props.config.localisation.locales.map((l) => l.code),
							default: props.config.localisation.defaultLocale,
						},
						collections: props.config.collections,
					},
				);
			} else {
				// ** This is only used on get multiple documents, in this case we dont request groups and so should
				// ** return fields in a flat format instead of nesting them if repeaters are present
				fields = FieldsFormatter.formatMultipleFlat(
					{
						fields: props.document.fields,
					},
					{
						host: props.config.host,
						builder: props.collection,
						collectionTranslations:
							props.collection.getData.config.useTranslations,
						localisation: {
							locales: props.config.localisation.locales.map((l) => l.code),
							default: props.config.localisation.defaultLocale,
						},
						collections: props.config.collections,
					},
				);
			}
		}

		return {
			id: props.document.id,
			collectionKey: props.document.collection_key,
			status: props.document.version_type ?? null,
			versionId: props.document.version_id ?? null,
			version: this.formatVersion({
				document: props.document,
			}),
			bricks: props.bricks ?? null,
			fields: fields,
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
			createdAt: Formatter.formatDate(props.document.created_at),
			updatedAt: Formatter.formatDate(props.document.updated_at),
		} satisfies CollectionDocumentResponse;
	};
	formatVersion = (props: {
		document: DocumentPropT;
	}): CollectionDocumentResponse["version"] => {
		const draftVersion = props.document.versions?.find(
			(v) => v.version_type === "draft",
		);
		const publishedVersion = props.document.versions?.find(
			(v) => v.version_type === "published",
		);

		return {
			draft: draftVersion?.id
				? {
						id: draftVersion.id,
						promotedFrom: draftVersion.promoted_from,
						createdAt: Formatter.formatDate(draftVersion.created_at),
						createdBy: draftVersion.created_by,
					}
				: null,
			published: publishedVersion?.id
				? {
						id: publishedVersion.id,
						promotedFrom: publishedVersion.promoted_from,
						createdAt: Formatter.formatDate(publishedVersion.created_at),
						createdBy: publishedVersion.created_by,
					}
				: null,
		};
	};

	// Client
	formatClientMultiple = (props: {
		documents: DocumentPropT[];
		collection: CollectionBuilder;
		config: Config;
	}) => {
		return props.documents.map((d) =>
			this.formatClientSingle({
				document: d,
				collection: props.collection,
				config: props.config,
			}),
		);
	};
	formatClientSingle = (props: {
		document: DocumentPropT;
		collection: CollectionBuilder;
		bricks?: BrickResponse[];
		fields?: FieldResponse[] | null;
		config: Config;
	}): ClientDocumentResponse => {
		const FieldsFormatter = Formatter.get("collection-document-fields");

		const res = this.formatSingle({
			document: props.document,
			collection: props.collection,
			bricks: props.bricks,
			fields: props.fields,
			config: props.config,
		});

		return {
			...res,
			bricks:
				res.bricks !== null
					? res.bricks.map((b) => {
							return {
								...b,
								fields: FieldsFormatter.objectifyFields(b.fields),
							} satisfies BrickAltResponse;
						})
					: null,
			fields:
				res.fields !== null
					? FieldsFormatter.objectifyFields(res.fields)
					: null,
		} satisfies ClientDocumentResponse;
	};
	static swagger = {
		type: "object",
		properties: {
			id: {
				type: "number",
			},
			versionId: {
				type: "number",
				nullable: true,
			},
			collectionKey: {
				type: "string",
				nullable: true,
			},
			status: {
				type: "string",
				nullable: true,
				enum: ["published", "draft", "revision"],
			},
			version: {
				type: "object",
				properties: {
					draft: {
						type: "object",
						properties: {
							id: {
								type: "number",
								nullable: true,
							},
							promotedFrom: {
								type: "number",
								nullable: true,
							},
							createdAt: {
								type: "string",
								nullable: true,
							},
							createdBy: {
								type: "number",
								nullable: true,
							},
						},
						nullable: true,
					},
					published: {
						type: "object",
						properties: {
							id: {
								type: "number",
								nullable: true,
							},
							promotedFrom: {
								type: "number",
								nullable: true,
							},
							createdAt: {
								type: "string",
								nullable: true,
							},
							createdBy: {
								type: "number",
								nullable: true,
							},
						},
						nullable: true,
					},
				},
			},
			bricks: {
				type: "array",
				items: CollectionDocumentBricksFormatter.swagger,
				nullable: true,
			},
			fields: {
				type: "array",
				nullable: true,
				items: CollectionDocumentFieldsFormatterClass.swagger,
			},
			createdBy: {
				type: "object",
				nullable: true,
				properties: {
					id: {
						type: "number",
					},
					email: {
						type: "string",
						nullable: true,
					},
					firstName: {
						type: "string",
						nullable: true,
					},
					lastName: {
						type: "string",
						nullable: true,
					},
					username: {
						type: "string",
						nullable: true,
					},
				},
			},
			createdAt: {
				type: "string",
				nullable: true,
			},
			updatedAt: {
				type: "string",
				nullable: true,
			},
			updatedBy: {
				type: "object",
				nullable: true,
				properties: {
					id: {
						type: "number",
					},
					email: {
						type: "string",
						nullable: true,
					},
					firstName: {
						type: "string",
						nullable: true,
					},
					lastName: {
						type: "string",
						nullable: true,
					},
					username: {
						type: "string",
						nullable: true,
					},
				},
			},
		},
	};
	static swaggerClient = {
		type: "object",
		properties: {
			...CollectionDocumentsFormatter.swagger.properties,
			bricks: {
				type: "array",
				nullable: true,
				items: {
					type: "object",
					additionalProperties: true,
					properties: {
						...CollectionDocumentBricksFormatter.swagger.properties,
						fields: {
							type: "object",
							additionalProperties: true,
						},
					},
				},
			},
			fields: {
				type: "object",
				nullable: true,
				additionalProperties: true,
			},
		},
	};
}
