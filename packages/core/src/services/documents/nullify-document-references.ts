import Repository from "../../libs/repositories/index.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
	ServiceFn,
} from "../../types.js";
import { prefixGeneratedColName } from "../../helpers.js";

const nullifyDocumentReferences: ServiceFn<
	[
		{
			documentId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const referenceTargets: Array<{
		table: LucidBrickTableName;
		columns: Array<keyof LucidBricksTable>;
	}> = [];

	for (const collection of context.config.collections) {
		const documentFields = collection.flatFields.filter(
			(df) => df.type === "document",
		);
		const docFieldTableName = collection.documentFieldsTableSchema?.name;

		const docuFieldColumns = documentFields
			.map((df) =>
				df.collection === data.collectionKey
					? prefixGeneratedColName(df.key)
					: null,
			)
			.filter((dfc) => dfc !== null);
		if (docuFieldColumns.length && docFieldTableName) {
			referenceTargets.push({
				table: docFieldTableName,
				columns: docuFieldColumns,
			});
		}

		for (const brick of collection.brickInstances) {
			const brickTables = collection.bricksTableSchema.filter(
				(bts) => bts.key.brick === brick.key,
			);

			const brickDocumentFields = brick.flatFields.filter(
				(field) =>
					field.type === "document" && field.collection === data.collectionKey,
			);

			for (const brickTable of brickTables) {
				const brickDocFieldColumns = brickDocumentFields
					.map((field) => prefixGeneratedColName(field.key))
					.filter(Boolean);

				if (brickDocFieldColumns.length && brickTable.name) {
					referenceTargets.push({
						table: brickTable.name,
						columns: brickDocFieldColumns,
					});
				}
			}
		}
	}

	if (referenceTargets.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const DocumentBricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);

	const results = await Promise.all(
		referenceTargets.map((rt) =>
			DocumentBricks.nullifyDocumentReferences(
				{
					columns: rt.columns,
					documentId: data.documentId,
				},
				{
					tableName: rt.table,
				},
			),
		),
	);

	for (const result of results) {
		if (result.error !== undefined) {
			return result;
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default nullifyDocumentReferences;
