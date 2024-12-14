import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { LucidCollectionSchema, Select, KyselyDB } from "../db/types.js";

export default class CollectionSchemaRepo {
	constructor(private db: KyselyDB) {}

	// ----------------------------------------
	// select
	selectSingle = async <K extends keyof Select<LucidCollectionSchema>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_schema">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_schema")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidCollectionSchema>, K> | undefined
		>;
	};
	selectMultiple = async <
		K extends keyof Select<LucidCollectionSchema>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_schema">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_schema")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.execute() as Promise<
			Array<Pick<Select<LucidCollectionSchema>, K>>
		>;
	};
}
