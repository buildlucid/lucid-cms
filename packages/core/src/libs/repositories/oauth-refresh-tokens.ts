import type { LucidDatabase } from "../db/client/index.js";
import { oauthRefreshTokensTable } from "../db/tables/oauth-refresh-tokens.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthRefreshTokensRepository extends StaticRepository<"lucid_oauth_refresh_tokens"> {
	constructor(db: LucidDatabase) {
		super(db, oauthRefreshTokensTable);
	}

	/**
	 * Atomically consumes an active refresh token.
	 */
	async consume<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				tokenHash: string;
				consumedAt: string;
			}
		>,
	) {
		const query = this.db
			.updateTable("lucid_oauth_refresh_tokens")
			.set({ consumed_at: props.consumedAt })
			.where("token_hash", "=", props.tokenHash)
			.where("consumed_at", "is", null)
			.where("revoked_at", "is", null)
			.where("expires_at", ">", props.consumedAt)
			.returning([
				"id",
				"family_id",
				"grant_id",
				"client_id",
				"resource",
				"expires_at",
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
				"family_id",
				"grant_id",
				"client_id",
				"resource",
				"expires_at",
			],
		});
	}

	/**
	 * Revokes every refresh token in a rotation family.
	 */
	async revokeFamily(props: { familyId: string; revokedAt: string }) {
		const query = this.db
			.updateTable("lucid_oauth_refresh_tokens")
			.set({ revoked_at: props.revokedAt })
			.where("family_id", "=", props.familyId)
			.where("revoked_at", "is", null);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "revokeFamily",
		});
		return exec.response;
	}

	/**
	 * Revokes every refresh token issued for a grant.
	 */
	async revokeGrant(props: { grantId: number; revokedAt: string }) {
		const query = this.db
			.updateTable("lucid_oauth_refresh_tokens")
			.set({ revoked_at: props.revokedAt })
			.where("grant_id", "=", props.grantId)
			.where("revoked_at", "is", null);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "revokeGrant",
		});
		return exec.response;
	}
}
