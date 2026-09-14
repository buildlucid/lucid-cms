import type { RefResource, ServiceFn } from "../../../exports/types.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import type {
	CollectionSchemaColumn,
	TableType,
} from "../../../libs/collection/schema/types.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
} from "../../../libs/db/tables/index.js";
import type { Select } from "../../../libs/db/types.js";
import { createFieldTargetCollector } from "../../../libs/refs/collect-field-targets.js";
import {
	addRefTarget,
	shouldIncludeRefResource,
} from "../../../libs/refs/targets.js";
import type { RefTargets } from "../../../libs/refs/types.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";

/**
 * Identifies a document target that points back to the response row currently
 * being hydrated. The caller can reuse the document already in its response.
 */
const isCurrentDocumentTarget = (
	row: Select<LucidBricksTable>,
	target: {
		table: string;
		value: unknown;
	},
) => {
	if (target.value !== row.document_id) return false;

	const tableNameRes = buildTableName(
		"document",
		{ collection: row.collection_key },
		null,
	);
	return !tableNameRes.error && tableNameRes.data.name === target.table;
};

/**
 * Collects resource targets from relation storage and embedded field values.
 * The caller controls direct relation resources, while embedded targets are
 * always collected because fields may need them while formatting their values.
 */
const collectRefTargets: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			brickSchema: {
				name: LucidBrickTableName;
				type: TableType;
				key: {
					collection: string;
					brick?: string;
					fieldPath?: string[];
				};
				columns: CollectionSchemaColumn[];
			}[];
			responses: (BrickQueryResponse | DocumentQueryResponse)[];
			/** Direct relation resources requested for the public response. */
			resources?: RefResource[];
		},
	],
	RefTargets
> = async (_, data) => {
	const targets: RefTargets = {};
	const collectors = data.brickSchema.map((schema) => ({
		schema,
		collect: createFieldTargetCollector(data.collection, schema),
	}));

	for (const response of data.responses) {
		for (const { schema, collect } of collectors) {
			const rows = response[schema.name];
			if (!Array.isArray(rows)) continue;

			for (const row of rows) {
				for (const target of collect(row)) {
					if (
						target.kind === "direct" &&
						!shouldIncludeRefResource(target.resource, data.resources)
					) {
						continue;
					}

					if (
						target.kind === "embedded" &&
						target.resource === "documents" &&
						isCurrentDocumentTarget(row, target)
					) {
						continue;
					}

					addRefTarget(targets, target);
				}
			}
		}
	}

	return {
		data: targets,
		error: undefined,
	};
};

export default collectRefTargets;
