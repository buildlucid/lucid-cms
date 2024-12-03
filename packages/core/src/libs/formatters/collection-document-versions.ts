import Formatter from "./index.js";
import type { CollectionDocumentVersionResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../db/types.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";

interface DocumentVersionPropT {
	id: number;
	version_type: DocumentVersionType;
	promoted_from: number | null;
	created_at: Date | string | null;
	created_by: number | null;
	document_id: number | null;
	collection_key: string | null;
	document_created_by: number | null;
	document_created_at: Date | string | null;
	document_updated_by: number | null;
	document_updated_at: Date | string | null;
	bricks: Array<{
		id: number;
		brick_key: string | null;
		brick_type: BrickTypes;
		field_count: unknown;
	}>;
}

export default class CollectionDocumentVersions {
	formatMultiple = (props: {
		versions: DocumentVersionPropT[];
	}) => {
		return props.versions.map((v) =>
			this.formatSingle({
				version: v,
			}),
		);
	};
	formatSingle = (props: {
		version: DocumentVersionPropT;
	}) => {
		return {
			id: props.version.id,
			versionType: props.version.version_type,
			promotedFrom: props.version.promoted_from ?? null,
			createdAt: Formatter.formatDate(props.version.created_at),
			createdBy: props.version.created_by ?? null,
			document: {
				id: props.version.document_id ?? null,
				collectionKey: props.version.collection_key,
				createdBy: props.version.document_created_by ?? null,
				createdAt: Formatter.formatDate(props.version.document_created_at),
				updatedAt: Formatter.formatDate(props.version.document_updated_at),
				updatedBy: props.version.document_updated_by ?? null,
			},
			bricks: props.version.bricks.reduce<
				CollectionDocumentVersionResponse["bricks"]
			>(
				(acc, brick) => {
					if (!acc[brick.brick_type]) {
						acc[brick.brick_type as keyof typeof acc] = [];
					}
					(
						acc[brick.brick_type as keyof typeof acc] as Array<{
							id: number;
							brickKey: string | null;
							fields: number;
						}>
					).push({
						id: brick.id,
						brickKey: brick.brick_key,
						fields:
							typeof brick.field_count === "number" ? brick.field_count : 0,
					});
					return acc;
				},
				{} as CollectionDocumentVersionResponse["bricks"],
			),
		} satisfies CollectionDocumentVersionResponse;
	};

	static swagger = {
		type: "object",
		properties: {
			id: {
				type: "number",
			},
			versionType: {
				type: "string",
				nullable: true,
				enum: ["published", "draft", "revision"],
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
			bricks: {
				type: "object",
				nullable: true,
				additionalProperties: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: {
								type: "number",
							},
							brickKey: {
								type: "string",
								nullable: true,
							},
							fields: {
								type: "number",
							},
						},
					},
				},
			},
			document: {
				type: "object",
				nullable: true,
				properties: {
					id: {
						type: "number",
					},
					collectionKey: {
						type: "string",
						nullable: true,
					},
					createdBy: {
						type: "number",
						nullable: true,
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
						type: "number",
						nullable: true,
					},
				},
			},
		},
	};
}
