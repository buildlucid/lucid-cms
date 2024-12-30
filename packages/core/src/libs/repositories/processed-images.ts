import { sql } from "kysely";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { HeadlessProcessedImages, Select, KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class ProcessedImagesRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	count = async (props: {
		where: QueryBuilderWhere<"lucid_processed_images">;
	}) => {
		let query = this.db
			.selectFrom("lucid_processed_images")
			.select(sql`count(*)`.as("count"));

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<{ count: string } | undefined>;
	};
	// ----------------------------------------
	// select
	selectMultiple = async <
		K extends keyof Select<HeadlessProcessedImages>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_processed_images">;
	}) => {
		let query = this.db
			.selectFrom("lucid_processed_images")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<
			Array<Pick<Select<HeadlessProcessedImages>, K>>
		>;
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		key: string;
		mediaKey: string;
		fileSize: number;
	}) => {
		return this.db
			.insertInto("lucid_processed_images")
			.values({
				key: props.key,
				media_key: props.mediaKey,
				file_size: props.fileSize,
			})
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_processed_images">;
	}) => {
		let query = this.db.deleteFrom("lucid_processed_images").returning("key");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
