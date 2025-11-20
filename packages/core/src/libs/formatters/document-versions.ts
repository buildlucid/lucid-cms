import formatter from "./index.js";
import type {
	DocumentVersionResponse,
	LucidBrickTableName,
} from "../../types.js";
import type { RevisionsQueryResponse } from "../repositories/document-versions.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";

const formatMultiple = (props: {
	versions: RevisionsQueryResponse[];
	bricksSchema: CollectionSchemaTable<LucidBrickTableName>[];
}): DocumentVersionResponse[] => {
	return props.versions.map((v) =>
		formatSingle({
			version: v,
			bricksSchema: props.bricksSchema,
		}),
	);
};

const formatSingle = (props: {
	version: RevisionsQueryResponse;
	bricksSchema: CollectionSchemaTable<LucidBrickTableName>[];
}): DocumentVersionResponse => {
	const formattedBricks: DocumentVersionResponse["bricks"] = {
		builder: [],
		fixed: [],
	};

	for (const schema of props.bricksSchema) {
		const tableName = schema.name as keyof RevisionsQueryResponse;

		if (tableName in props.version && Array.isArray(props.version[tableName])) {
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
		createdAt: formatter.formatDate(props.version.created_at),
		createdBy: props.version.created_by ?? null,
		document: {
			id: props.version.document_id ?? null,
			collectionKey: props.version.collection_key,
			createdBy: props.version.document_created_by ?? null,
			createdAt: formatter.formatDate(props.version.document_created_at),
			updatedAt: formatter.formatDate(props.version.document_updated_at),
			updatedBy: props.version.document_updated_by ?? null,
		},
		bricks: formattedBricks,
	};
};

export default {
	formatMultiple,
	formatSingle,
};
