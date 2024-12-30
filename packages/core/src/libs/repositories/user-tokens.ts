import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { LucidUserTokens, Select, KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class UserTokensRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// selects
	selectSingle = async <K extends keyof Select<LucidUserTokens>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_user_tokens">;
	}) => {
		let query = this.db.selectFrom("lucid_user_tokens").select<K>(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidUserTokens>, K> | undefined
		>;
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_user_tokens">;
	}) => {
		let query = this.db.deleteFrom("lucid_user_tokens");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		userId: number;
		tokenType: LucidUserTokens["token_type"];
		expiryDate: string;
		token: string;
	}) => {
		return this.db
			.insertInto("lucid_user_tokens")
			.values({
				user_id: props.userId,
				token: props.token,
				token_type: props.tokenType,
				expiry_date: props.expiryDate,
			})
			.returning("token")
			.executeTakeFirst();
	};
}
