import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { Permission } from "../../types/response.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class RolePermissionsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// create
	createMultiple = async (props: {
		items: Array<{
			roleId: number;
			permission: Permission;
		}>;
	}) => {
		return this.db
			.insertInto("lucid_role_permissions")
			.values(
				props.items.map((i) => ({
					role_id: i.roleId,
					permission: i.permission,
				})),
			)
			.execute();
	};
	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_role_permissions">;
	}) => {
		let query = this.db.deleteFrom("lucid_role_permissions").returning("id");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
}
