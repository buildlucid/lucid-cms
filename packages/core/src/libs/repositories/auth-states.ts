import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
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
		code_verifier: z.string(),
		nonce: z.string().nullable(),
		authenticated_user_id: z.number().nullable(),
		action_type: z.string(),
		invitation_token_id: z.number().nullable(),
		invitation_token: z.string().nullable(),
		redirect_path: z.string().nullable(),
		expiry_date: z.union([z.string(), z.date()]),
		consumed_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		state: this.dbAdapter.getDataType("text"),
		provider_key: this.dbAdapter.getDataType("text"),
		code_verifier: this.dbAdapter.getDataType("text"),
		nonce: this.dbAdapter.getDataType("text"),
		authenticated_user_id: this.dbAdapter.getDataType("integer"),
		action_type: this.dbAdapter.getDataType("text"),
		invitation_token_id: this.dbAdapter.getDataType("integer"),
		invitation_token: this.dbAdapter.getDataType("text"),
		redirect_path: this.dbAdapter.getDataType("text"),
		expiry_date: this.dbAdapter.getDataType("timestamp"),
		consumed_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Atomically consumes an unexpired provider authentication state.
	 */
	async consume<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				state: string;
				providerKey: string;
				consumedAt: string;
			}
		>,
	) {
		const query = this.db
			.updateTable("lucid_auth_states")
			.set({ consumed_at: props.consumedAt })
			.where("state", "=", props.state)
			.where("provider_key", "=", props.providerKey)
			.where("expiry_date", ">", props.consumedAt)
			.where("consumed_at", "is", null)
			.returning([
				"id",
				"invitation_token_id",
				"redirect_path",
				"action_type",
				"authenticated_user_id",
				"code_verifier",
				"nonce",
			]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "consume",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"invitation_token_id",
				"redirect_path",
				"action_type",
				"authenticated_user_id",
				"code_verifier",
				"nonce",
			],
		});
	}

	/**
	 * Selects an active provider state with its invitation details.
	 */
	async selectSingleWithInvitation<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				state: string;
				providerKey: string;
				now: string;
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
				"lucid_auth_states.invitation_token",
			])
			.where("lucid_auth_states.state", "=", props.state)
			.where("lucid_auth_states.provider_key", "=", props.providerKey)
			.where("lucid_auth_states.expiry_date", ">", props.now)
			.where("lucid_auth_states.consumed_at", "is", null);

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

	/**
	 * Removes a raw invitation token from a provider state.
	 */
	async scrubInvitationToken(props: { state: string; providerKey: string }) {
		const query = this.db
			.updateTable("lucid_auth_states")
			.set({ invitation_token: null })
			.where("state", "=", props.state)
			.where("provider_key", "=", props.providerKey);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "scrubInvitationToken",
		});
		return exec.response;
	}
}
