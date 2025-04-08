import Formatter from "./index.js";
import DocumentFieldsFormatter from "./document-fields.js";
import DocumentBricksFormatter from "./document-bricks.js";
import type { CollectionBuilder } from "../../builders.js";
import type {
	Config,
	CollectionDocumentResponse,
	DocumentVersionType,
	BrickResponse,
	FieldResponse,
} from "../../types.js";

export interface DocumentPropT {
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
}

export default class DocumentsFormatter {
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
	}): CollectionDocumentResponse => {
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
				items: DocumentBricksFormatter.swagger,
				nullable: true,
			},
			fields: {
				type: "array",
				nullable: true,
				items: DocumentFieldsFormatter.swagger,
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
}
