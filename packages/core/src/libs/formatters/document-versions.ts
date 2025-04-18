import Formatter from "./index.js";
import type {
	CollectionDocumentVersionResponse,
	LucidBrickTableName,
} from "../../types.js";
import type { RevisionsQueryResponse } from "../repositories/document-versions.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";

export default class DocumentVersions {
	formatMultiple(props: {
		versions: RevisionsQueryResponse[];
		bricksSchema: CollectionSchemaTable<LucidBrickTableName>[];
	}): CollectionDocumentVersionResponse[] {
		return props.versions.map((v) =>
			this.formatSingle({
				version: v,
				bricksSchema: props.bricksSchema,
			}),
		);
	}
	formatSingle(props: {
		version: RevisionsQueryResponse;
		bricksSchema: CollectionSchemaTable<LucidBrickTableName>[];
	}): CollectionDocumentVersionResponse {
		const formattedBricks: CollectionDocumentVersionResponse["bricks"] = {
			builder: [],
			fixed: [],
		};

		for (const schema of props.bricksSchema) {
			const tableName = schema.name as keyof RevisionsQueryResponse;

			if (
				tableName in props.version &&
				Array.isArray(props.version[tableName])
			) {
				const brickInstances = new Map<string, BrickTypes>();

				for (const row of props.version[tableName]) {
					brickInstances.set(row.brick_instance_id, row.brick_type);
				}
				for (const [_, brickType] of brickInstances.entries()) {
					formattedBricks[brickType].push({
						brickKey: schema.key.brick || null,
					});
				}
			}
		}

		return {
			id: props.version.id,
			versionType: props.version.type,
			promotedFrom: props.version.promoted_from,
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
			bricks: formattedBricks,
		};
	}

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
							brickKey: {
								type: "string",
								nullable: true,
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
