import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { KyselyDB, BooleanInt } from "../db/types.js";
import type { FieldTypes } from "../custom-fields/types.js";

export default class CollectionDocumentFieldsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// upsert
	createMultiple = async (props: {
		items: Array<{
			collectionDocumentId: number;
			collectionDocumentVersionId: number;
			collectionBrickId: number;
			key: string;
			type: FieldTypes;
			groupId?: number | null;
			textValue: string | null;
			intValue: number | null;
			boolValue: boolean | null;
			jsonValue: Record<string, unknown> | null;
			userId: number | null;
			mediaId: number | null;
			documentId: number | null;
			localeCode: string;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_document_fields")
			.values(
				props.items.map((f) => {
					return {
						collection_document_id: f.collectionDocumentId,
						collection_document_version_id: f.collectionDocumentVersionId,
						collection_brick_id: f.collectionBrickId,
						key: f.key,
						type: f.type,
						group_id: f.groupId,
						text_value: f.textValue,
						int_value: f.intValue,
						bool_value: this.dbAdapter.formatInsertValue<BooleanInt | null>(
							"boolean",
							f.boolValue,
						),
						json_value: this.dbAdapter.formatInsertValue<string | null>(
							"json",
							f.jsonValue,
						),
						user_id: f.userId,
						media_id: f.mediaId,
						document_id: f.documentId,
						locale_code: f.localeCode,
					};
				}),
			)
			.returning(["fields_id"])
			.execute();
	};
	// ----------------------------------------
	// update
	updateMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_fields">;
		data: {
			documentId?: number | null;
		};
	}) => {
		let query = this.db.updateTable("lucid_collection_document_fields").set({
			document_id: props.data.documentId,
		});

		query = queryBuilder.update(query, props.where);

		return query.execute();
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_fields">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_collection_document_fields")
			.returning(["fields_id"]);

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
