import { getBricksTableSchema } from "../../libs/collection/schema/live/schema-filters.js";
import { DocumentBricksRepository } from "../../libs/repositories/index.js";
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
	const Bricks = new DocumentBricksRepository(context.db, context.config.db);

	const brickTableSchema = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (brickTableSchema.error) return brickTableSchema;

	const exlcudeRepeaters = brickTableSchema.data.filter(
		(table) => table.type !== "repeater",
	);

	const deleteBricksPromises = [];
	for (const brickTable of exlcudeRepeaters) {
		deleteBricksPromises.push(
			Bricks.deleteSingle(
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
	await Promise.all(deleteBricksPromises);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiple;
