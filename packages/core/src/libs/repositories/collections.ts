import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type {
	LucidCollections,
	Select,
	KyselyDB,
	BooleanInt,
} from "../db/types.js";

export default class EmailsRepo {
	constructor(private db: KyselyDB) {}

	// ----------------------------------------
	// selects
	selectAll = async <K extends keyof Select<LucidCollections>>(props: {
		select: K[];
	}) => {
		return this.db
			.selectFrom("lucid_collections")
			.select<K>(props.select)
			.execute() as Promise<Array<Pick<Select<LucidCollections>, K>>>;
	};

	// ----------------------------------------
	// create
	createSingle = async (props: {
		key: string;
	}) => {
		return this.db
			.insertInto("lucid_collections")
			.values({
				key: props.key,
			})
			.returningAll()
			.executeTakeFirst();
	};
	createMultiple = async (props: {
		items: Array<{
			key: string;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_collections")
			.values(
				props.items.map((i) => ({
					key: i.key,
				})),
			)
			.execute();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collections">;
		data: {
			isDeleted: BooleanInt;
			isDeletedAt: string | null;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_collections")
			.set({
				is_deleted: props.data.isDeleted,
				is_deleted_at: props.data.isDeletedAt,
			})
			.returningAll();

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collections">;
	}) => {
		let query = this.db.deleteFrom("lucid_collections").returning("key");

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
}
