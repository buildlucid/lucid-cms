import z from "zod/v4";
import constants from "../../constants/constants.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class AuthStatesRepository extends StaticRepository<"lucid_auth_states"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_auth_states");
	}
	tableSchema = z.object({
		id: z.number(),
		state: z.string(),
		provider_key: z.string(),
		authenticated_user_id: z.number().nullable(),
		action_type: z.string(),
		invitation_token_id: z.number().nullable(),
		redirect_path: z.string().nullable(),
		expiry_date: z.union([z.string(), z.date()]),
		created_at: z.union([z.string(), z.date()]),
		// user tokens
		invitation_token: z.string().nullable().optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		state: this.dbAdapter.getDataType("text"),
		provider_key: this.dbAdapter.getDataType("text"),
		authenticated_user_id: this.dbAdapter.getDataType("integer"),
		action_type: this.dbAdapter.getDataType("text"),
		invitation_token_id: this.dbAdapter.getDataType("integer"),
		redirect_path: this.dbAdapter.getDataType("text"),
		expiry_date: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async selectSingleWithInvitation<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				state: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_auth_states")
			.select([
				"lucid_auth_states.id",
				"lucid_auth_states.redirect_path",
				"lucid_auth_states.action_type",
				"lucid_auth_states.invitation_token_id",
			])
			.leftJoin(
				"lucid_user_tokens",
				"lucid_user_tokens.id",
				"lucid_auth_states.invitation_token_id",
			)
			.select(["lucid_user_tokens.token as invitation_token"])
			.where("lucid_auth_states.state", "=", props.state)
			.where((eb) =>
				eb.or([
					eb("lucid_auth_states.invitation_token_id", "is", null),
					eb(
						"lucid_user_tokens.token_type",
						"=",
						constants.userTokens.invitation,
					),
				]),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleWithInvitation",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"redirect_path",
				"action_type",
				"invitation_token_id",
				"invitation_token",
			],
		});
	}
}
