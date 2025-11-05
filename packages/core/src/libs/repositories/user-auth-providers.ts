import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserAuthProvidersRepository extends StaticRepository<"lucid_user_auth_providers"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_auth_providers");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		provider_key: z.string(),
		provider_user_id: z.string(),
		linked_at: z.union([z.string(), z.date()]).nullable(),
		metadata: z.record(z.string(), z.unknown()).nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		// user
		user_email: z.email(),
		user_first_name: z.string().nullable(),
		user_last_name: z.string().nullable(),
		user_invitation_accepted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		user_is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		user_is_locked: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		user_id: this.dbAdapter.getDataType("integer"),
		provider_key: this.dbAdapter.getDataType("text"),
		provider_user_id: this.dbAdapter.getDataType("text"),
		linked_at: this.dbAdapter.getDataType("timestamp"),
		metadata: this.dbAdapter.getDataType("json"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				userId: "user_id",
				providerKey: "provider_key",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				providerKey: "provider_key",
			},
		},
		operators: {
			providerKey: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

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
