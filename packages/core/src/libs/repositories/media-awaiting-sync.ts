import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { LucidMediaAwaitingSync, Select, KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class MediaAwaitingSyncRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// select
	selectSingle = async <K extends keyof Select<LucidMediaAwaitingSync>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_media_awaiting_sync">;
	}) => {
		let query = this.db
			.selectFrom("lucid_media_awaiting_sync")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidMediaAwaitingSync>, K> | undefined
		>;
	};
	selectMultiple = async <
		K extends keyof Select<LucidMediaAwaitingSync>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_media_awaiting_sync">;
	}) => {
		let query = this.db
			.selectFrom("lucid_media_awaiting_sync")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<
			Array<Pick<Select<LucidMediaAwaitingSync>, K>>
		>;
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		key: string;
		timestamp: string;
	}) => {
		return this.db
			.insertInto("lucid_media_awaiting_sync")
			.values({
				key: props.key,
				timestamp: props.timestamp,
			})
			.returning("key")
			.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_media_awaiting_sync">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_media_awaiting_sync")
			.returning("key");

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_media_awaiting_sync">;
	}) => {
		let query = this.db.deleteFrom("lucid_media_awaiting_sync");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
