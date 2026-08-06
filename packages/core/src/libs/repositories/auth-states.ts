import type { LucidDatabase } from "../db/client/index.js";
import { authStatesTable } from "../db/tables/auth-states.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class AuthStatesRepository extends StaticRepository<"lucid_auth_states"> {
	constructor(db: LucidDatabase) {
		super(db, authStatesTable);
	}

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
