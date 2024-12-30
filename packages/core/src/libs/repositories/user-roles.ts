import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class UserRolesRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// create
	createMultiple = async (props: {
		items: Array<{
			userId: number;
			roleId: number;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_user_roles")
			.values(
				props.items.map((i) => ({
					user_id: i.userId,
					role_id: i.roleId,
				})),
			)
			.execute();
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_user_roles">;
	}) => {
		let query = this.db.deleteFrom("lucid_user_roles").returning("id");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
