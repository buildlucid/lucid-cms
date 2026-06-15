import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserRolesRepository extends StaticRepository<"lucid_user_roles"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_roles");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		role_id: z.number(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		role_id: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Deletes role assignments for a user inside the selected tenant role scope.
	 * A global request keeps the previous behaviour and clears every assignment.
	 */
	async deleteMultipleByUserTenantScope<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				userId: number;
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.deleteFrom("lucid_user_roles")
			.where("user_id", "=", props.userId)
			.returning(["id"]);

		if (props.tenantKey != null) {
			const roleIdsQuery = this.db
				.selectFrom("lucid_roles")
				.select("id")
				.$call((qb) =>
					queryBuilder.tenantScope(qb, {
						tenantKey: props.tenantKey,
						column: "lucid_roles.tenant_key",
					}),
				);

			query = query.where("role_id", "in", roleIdsQuery);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "deleteMultipleByUserTenantScope",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: ["id"],
		});
	}
}
