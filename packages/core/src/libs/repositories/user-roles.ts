import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
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

	/** Deletes every role assignment for a user. */
	async deleteMultipleByUser<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				userId: number;
			}
		>,
	) {
		const query = this.db
			.deleteFrom("lucid_user_roles")
			.where("user_id", "=", props.userId)
			.returning(["id"]);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "deleteMultipleByUser",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: ["id"],
		});
	}
}
