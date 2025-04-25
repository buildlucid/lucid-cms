import Formatter from "./index.js";
import type { CollectionBuilder } from "../../builders.js";
import type {
	Config,
	DocumentResponse,
	BrickResponse,
	FieldResponse,
	ClientDocumentResponse,
	BrickAltResponse,
} from "../../types.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";

export default class DocumentsFormatter {
	formatMultiple = (props: {
		documents: DocumentQueryResponse[];
		collection: CollectionBuilder;
		config: Config;
		hasFields: boolean;
		hasBricks: boolean;
		relationData?: FieldRelationResponse;
	}) => {
		const DocumentBricksFormatter = Formatter.get("document-bricks");

		return props.documents.map((d) => {
			let fields: FieldResponse[] | null = null;
			let bricks: BrickResponse[] | null = null;
			if (props.hasFields) {
				fields = DocumentBricksFormatter.formatDocumentFields({
					bricksQuery: d,
					bricksSchema: props.collection.bricksTableSchema,
					relationMetaData: props.relationData || {},
					collection: props.collection,
					config: props.config,
				});
			}
			if (props.hasBricks) {
				bricks = DocumentBricksFormatter.formatMultiple({
					bricksQuery: d,
					bricksSchema: props.collection.bricksTableSchema,
					relationMetaData: props.relationData || {},
					collection: props.collection,
					config: props.config,
				});
			}

			return this.formatSingle({
				document: d,
				collection: props.collection,
				config: props.config,
				fields: fields,
				bricks: bricks || undefined,
			});
		});
	};
	formatSingle = (props: {
		document: DocumentQueryResponse;
		collection: CollectionBuilder;
		bricks?: BrickResponse[];
		fields?: FieldResponse[] | null;
		config: Config;
	}): DocumentResponse => {
		return {
			id: props.document.id,
			collectionKey: props.document.collection_key,
			status: props.document.version_type ?? null,
			versionId: props.document.version_id ?? null,
			version: this.formatVersion({
				document: props.document,
			}),
			bricks: props.bricks ?? null,
			fields: props.fields ?? null,
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
		} satisfies DocumentResponse;
	};
	formatVersion = (props: {
		document: DocumentQueryResponse;
	}): DocumentResponse["version"] => {
		const draftVersion = props.document.versions?.find(
			(v) => v.type === "draft",
		);
		const publishedVersion = props.document.versions?.find(
			(v) => v.type === "published",
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

	formatClientMultiple = (props: {
		documents: DocumentQueryResponse[];
		collection: CollectionBuilder;
		config: Config;
		hasFields: boolean;
		hasBricks: boolean;
		relationData?: FieldRelationResponse;
	}): ClientDocumentResponse[] => {
		const DocumentBricksFormatter = Formatter.get("document-bricks");

		return props.documents.map((d) => {
			let fields: FieldResponse[] | null = null;
			let bricks: BrickResponse[] | null = null;
			if (props.hasFields) {
				fields = DocumentBricksFormatter.formatDocumentFields({
					bricksQuery: d,
					bricksSchema: props.collection.bricksTableSchema,
					relationMetaData: props.relationData || {},
					collection: props.collection,
					config: props.config,
				});
			}
			if (props.hasBricks) {
				bricks = DocumentBricksFormatter.formatMultiple({
					bricksQuery: d,
					bricksSchema: props.collection.bricksTableSchema,
					relationMetaData: props.relationData || {},
					collection: props.collection,
					config: props.config,
				});
			}

			return this.formatClientSingle({
				document: d,
				collection: props.collection,
				config: props.config,
				fields: fields,
				bricks: bricks || undefined,
			});
		});
	};
	formatClientSingle = (props: {
		document: DocumentQueryResponse;
		collection: CollectionBuilder;
		bricks?: BrickResponse[];
		fields?: FieldResponse[] | null;
		config: Config;
	}): ClientDocumentResponse => {
		const FieldsFormatter = Formatter.get("document-fields");

		const res = this.formatSingle({
			document: props.document,
			collection: props.collection,
			bricks: props.bricks,
			fields: props.fields,
			config: props.config,
		});

		return {
			...res,
			bricks: res.bricks
				? res.bricks.map((b) => {
						return {
							...b,
							fields: FieldsFormatter.objectifyFields(b.fields),
						} satisfies BrickAltResponse;
					})
				: null,
			fields: res.fields ? FieldsFormatter.objectifyFields(res.fields) : null,
		} satisfies ClientDocumentResponse;
	};
}
