import type { LucidDatabase } from "../db/client/index.js";
import { userRolesTable } from "../db/tables/user-roles.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserRolesRepository extends StaticRepository<"lucid_user_roles"> {
	constructor(db: LucidDatabase) {
		super(db, userRolesTable);
	}

	/** Whether any of a user's roles requires two-factor authentication. */
	async selectRequiresTwoFactor(props: { userId: number }) {
		const query = this.db
			.selectFrom("lucid_user_roles")
			.innerJoin("lucid_roles", "lucid_roles.id", "lucid_user_roles.role_id")
			.select("lucid_roles.id")
			.where("lucid_user_roles.user_id", "=", props.userId)
			.where(
				"lucid_roles.require_two_factor",
				"=",
				this.dbAdapter.getDefault("boolean", "true"),
			)
			.limit(1);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectRequiresTwoFactor",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
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
