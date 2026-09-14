import { getBricksTableSchema } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentBricksRepository,
	DocumentReferencesRepository,
} from "../../libs/repositories/index.js";

import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultiple: ServiceFn<
	[
		{
			versionId: number;
			documentId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const Bricks = new DocumentBricksRepository(context.db);

	const brickTableSchema = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (brickTableSchema.error) return brickTableSchema;

	/**
	 * Child storage tables are linked to root document-fields/brick rows via foreign
	 * keys, so deleting the roots is enough to cascade repeater and relation rows.
	 */
	const rootTables = brickTableSchema.data.filter(
		(table) => table.type === "document-fields" || table.type === "brick",
	);

	const deleteBricksPromises = [];
	for (const brickTable of rootTables) {
		deleteBricksPromises.push(
			Bricks.deleteMultiple(
				{
					where: [
						{
							key: "document_id",
							operator: "=",
							value: data.documentId,
						},
						{
							key: "document_version_id",
							operator: "=",
							value: data.versionId,
						},
					],
				},
				{
					tableName: brickTable.name,
				},
			),
		);
	}
	const deleteResults = await Promise.all(deleteBricksPromises);
	for (const result of deleteResults) {
		if (result.error) return result;
	}

	const DocumentReferences = new DocumentReferencesRepository(context.db);
	const removeVersionRes = await DocumentReferences.deleteByVersion({
		collectionKey: data.collectionKey,
		versionId: data.versionId,
	});
	if (removeVersionRes.error) return removeVersionRes;

	return {
		data: undefined,
		error: undefined,
	};
};

export default deleteMultiple;
