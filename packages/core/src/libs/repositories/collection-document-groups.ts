import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import boolean from "../../utils/helpers/boolean.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class CollectionDocumentGroupsRepo {
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
			groupOrder: number;
			repeaterKey: string;
			groupOpen: boolean;
			ref: string;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_document_groups")
			.values(
				props.items.flatMap((g) => ({
					collection_document_id: g.collectionDocumentId,
					collection_document_version_id: g.collectionDocumentVersionId,
					collection_brick_id: g.collectionBrickId,
					group_order: g.groupOrder,
					repeater_key: g.repeaterKey,
					group_open: boolean.insertFormat(g.groupOpen, this.dbAdapter),
					ref: g.ref,
				})),
			)
			.returning(["group_id", "ref"])
			.execute();
	};
	// ----------------------------------------
	// update
	updateMultipleParentIds = async (props: {
		items: Array<{
			parentGroupId: number | null;
			groupId: number;
			collectionDocumentId: number;
			collectionDocumentVersionId: number;
			collectionBrickId: number;
			groupOrder: number;
			repeaterKey: string;
			groupOpen: boolean;
			ref: string;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collection_document_groups")
			.values(
				props.items.map((g) => {
					return {
						collection_document_id: g.collectionDocumentId,
						parent_group_id: g.parentGroupId,
						group_id: g.groupId,
						collection_document_version_id: g.collectionDocumentVersionId,
						collection_brick_id: g.collectionBrickId,
						group_order: g.groupOrder,
						repeater_key: g.repeaterKey,
						ref: g.ref,
						group_open: boolean.insertFormat(g.groupOpen, this.dbAdapter),
					};
				}),
			)
			.onConflict((oc) =>
				oc.column("group_id").doUpdateSet((eb) => ({
					parent_group_id: eb.ref("excluded.parent_group_id"),
				})),
			)
			.execute();
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_groups">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_collection_document_groups")
			.returning(["group_id"]);

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
