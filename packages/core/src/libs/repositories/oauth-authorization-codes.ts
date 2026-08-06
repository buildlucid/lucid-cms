import type { LucidDatabase } from "../db/client/index.js";
import { oauthAuthorizationCodesTable } from "../db/tables/oauth-authorization-codes.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthAuthorizationCodesRepository extends StaticRepository<"lucid_oauth_authorization_codes"> {
	constructor(db: LucidDatabase) {
		super(db, oauthAuthorizationCodesTable);
	}

	/**
	 * Atomically consumes an unexpired OAuth authorization code.
	 */
	async consume<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				codeHash: string;
				consumedAt: string;
			}
		>,
	) {
		const query = this.db
			.updateTable("lucid_oauth_authorization_codes")
			.set({ consumed_at: props.consumedAt })
			.where("code_hash", "=", props.codeHash)
			.where("consumed_at", "is", null)
			.where("expires_at", ">", props.consumedAt)
			.returning([
				"id",
				"grant_id",
				"client_id",
				"redirect_uri",
				"resource",
				"code_challenge",
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
				"grant_id",
				"client_id",
				"redirect_uri",
				"resource",
				"code_challenge",
			],
		});
	}
}
