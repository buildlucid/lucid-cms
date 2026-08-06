import type { LucidDatabase } from "../db/client/index.js";
import { userAuthProvidersTable } from "../db/tables/user-auth-providers.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserAuthProvidersRepository extends StaticRepository<"lucid_user_auth_providers"> {
	constructor(db: LucidDatabase) {
		super(db, userAuthProvidersTable);
	}

	// ----------------------------------------
	// queries
	async selectUserAuthProvider<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				providerKey: string;
				providerUserId: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_user_auth_providers")
			.select([
				"lucid_user_auth_providers.id",
				"lucid_user_auth_providers.user_id",
				"lucid_user_auth_providers.provider_key",
				"lucid_user_auth_providers.provider_user_id",
				"lucid_user_auth_providers.linked_at",
				"lucid_user_auth_providers.metadata",
				"lucid_user_auth_providers.created_at",
				"lucid_user_auth_providers.updated_at",
			])
			.innerJoin(
				"lucid_users",
				"lucid_users.id",
				"lucid_user_auth_providers.user_id",
			)
			.select([
				"lucid_users.email as user_email",
				"lucid_users.first_name as user_first_name",
				"lucid_users.last_name as user_last_name",
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
			])
			.where("lucid_user_auth_providers.provider_key", "=", props.providerKey)
			.where(
				"lucid_user_auth_providers.provider_user_id",
				"=",
				props.providerUserId,
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectUserAuthProvider",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"provider_key",
				"provider_user_id",
				"linked_at",
				"metadata",
				"created_at",
				"updated_at",
				"user_email",
				"user_first_name",
				"user_last_name",
				"user_is_deleted",
				"user_is_locked",
			],
		});
	}
}
