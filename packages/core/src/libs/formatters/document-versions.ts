import z from "zod";
import Formatter from "./index.js";
import type {
	DocumentVersionResponse,
	LucidBrickTableName,
} from "../../types.js";
import type { RevisionsQueryResponse } from "../repositories/document-versions.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";

export default class DocumentVersions {
	formatMultiple(props: {
		versions: RevisionsQueryResponse[];
		bricksSchema: CollectionSchemaTable<LucidBrickTableName>[];
	}): DocumentVersionResponse[] {
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
	}): DocumentVersionResponse {
		const formattedBricks: DocumentVersionResponse["bricks"] = {
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

	static schema = z.object({
		id: z.number().meta({
			description: "The document version ID",
			example: 1,
		}),
		versionType: z.enum(["published", "draft", "revision"]).meta({
			description: "The version type",
			example: "draft",
		}),
		promotedFrom: z.number().nullable().meta({
			description: "ID of the version this was promoted from, if applicable",
			example: 122,
		}),
		createdAt: z.string().nullable().meta({
			description: "Timestamp when this version was created",
			example: "2025-04-20T14:30:00Z",
		}),
		createdBy: z.number().nullable().meta({
			description: "User ID who created this version",
			example: 1,
		}),
		document: z.object({
			id: z.number().nullable().meta({
				description: "The document's ID",
				example: 42,
			}),
			collectionKey: z.string().nullable().meta({
				description: "The collection this document belongs to",
				example: "pages",
			}),
			createdBy: z.number().nullable().meta({
				description: "User ID who created the document",
				example: 1,
			}),
			createdAt: z.string().nullable().meta({
				description: "Timestamp when the document was created",
				example: "2025-03-15T09:22:10Z",
			}),
			updatedAt: z.string().nullable().meta({
				description: "Timestamp when the document was last updated",
				example: "2025-04-18T11:45:30Z",
			}),
			updatedBy: z.number().nullable().meta({
				description: "User ID who last updated the document",
				example: 2,
			}),
		}),
		bricks: z.object({
			fixed: z.array(
				z.object({
					brickKey: z.string().nullable().meta({
						description: "The identifier key for this brick",
						example: "seo",
					}),
				}),
			),
			builder: z.array(
				z.object({
					brickKey: z.string().nullable().meta({
						description: "The identifier key for this brick",
						example: "hero",
					}),
				}),
			),
		}),
	});
}
