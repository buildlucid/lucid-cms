import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { CollectionSchema } from "../../services/collection-migrator/schema/types.js";
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
	selectLatest = async <K extends keyof Select<LucidCollectionSchema>>(props: {
		select: K[];
	}) => {
		const query = this.db
			.selectFrom("lucid_collection_schema as s1")
			.select(props.select)
			.where((eb) =>
				eb.not(
					eb.exists(
						eb
							.selectFrom("lucid_collection_schema as s2")
							.select("s2.id")
							.where("s2.collection_key", "=", eb.ref("s1.collection_key"))
							.where("s2.created_at", ">", eb.ref("s1.created_at")),
					),
				),
			);

		return query.execute() as Promise<
			Array<Pick<Select<LucidCollectionSchema>, K>>
		>;
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		collectionKey: string;
		schema: string;
		checksum: string;
	}) => {
		return this.db
			.insertInto("lucid_collection_schema")
			.values({
				collection_key: props.collectionKey,
				schema: props.schema,
				checksum: props.checksum,
			})
			.returningAll()
			.executeTakeFirst();
	};
}
