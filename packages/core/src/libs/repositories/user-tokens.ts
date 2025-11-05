import z from "zod/v4";
import constants from "../../constants/constants.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UserTokensRepository extends StaticRepository<"lucid_user_tokens"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_user_tokens");
	}
	tableSchema = z.object({
		id: z.number(),
		user_id: z.number(),
		token_type: z.union([
			z.literal(constants.userTokens.passwordReset),
			z.literal(constants.userTokens.refresh),
			z.literal(constants.userTokens.invitation),
		]),
		token: z.string(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		expiry_date: z.union([z.string(), z.date()]),
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
		token_type: this.dbAdapter.getDataType("varchar", 255),
		token: this.dbAdapter.getDataType("varchar", 255),
		created_at: this.dbAdapter.getDataType("timestamp"),
		expiry_date: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async selectUserInvitation<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_user_tokens")
			.select([
				"lucid_user_tokens.id",
				"lucid_user_tokens.user_id",
				"lucid_user_tokens.token_type",
				"lucid_user_tokens.token",
				"lucid_user_tokens.created_at",
				"lucid_user_tokens.expiry_date",
			])
			.innerJoin("lucid_users", "lucid_users.id", "lucid_user_tokens.user_id")
			.select([
				"lucid_users.email as user_email",
				"lucid_users.first_name as user_first_name",
				"lucid_users.last_name as user_last_name",
				"lucid_users.invitation_accepted as user_invitation_accepted",
				"lucid_users.is_deleted as user_is_deleted",
				"lucid_users.is_locked as user_is_locked",
			])
			.where("lucid_user_tokens.expiry_date", ">", new Date().toISOString())
			.where("lucid_user_tokens.id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectUserInvitation",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"user_id",
				"token_type",
				"token",
				"created_at",
				"expiry_date",
				"user_email",
				"user_first_name",
				"user_last_name",
				"user_invitation_accepted",
				"user_is_deleted",
				"user_is_locked",
			],
		});
	}
}
