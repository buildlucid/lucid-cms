import type { LucidDatabase } from "../db/client/index.js";
import type { OAuthPrincipalType } from "../db/tables/index.js";
import { oauthGrantsTable } from "../db/tables/oauth-grants.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthGrantsRepository extends StaticRepository<"lucid_oauth_grants"> {
	constructor(db: LucidDatabase) {
		super(db, oauthGrantsTable);
	}

	/**
	 * Selects an OAuth grant and its scopes by ID.
	 */
	async selectSingleWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				includeRevoked?: boolean;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_oauth_grants")
			.select((eb) => [
				"id",
				"name",
				"client_id",
				"client_name",
				"client_uri",
				"principal_type",
				"user_id",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_oauth_grant_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_oauth_grant_scopes.grant_id",
								"=",
								"lucid_oauth_grants.id",
							),
					)
					.as("scopes"),
			])
			.where("id", "=", props.id);

		if (props.includeRevoked !== true) {
			query = query.where("revoked_at", "is", null);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleWithScopes",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"name",
				"client_id",
				"client_name",
				"client_uri",
				"principal_type",
				"user_id",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				"scopes",
			],
		});
	}

	/**
	 * Selects OAuth grants and scopes for a principal.
	 */
	async selectMultipleWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				principalType: OAuthPrincipalType;
				userId?: number;
				includeRevoked?: boolean;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_oauth_grants")
			.select((eb) => [
				"id",
				"name",
				"client_id",
				"client_name",
				"client_uri",
				"principal_type",
				"user_id",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_oauth_grant_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_oauth_grant_scopes.grant_id",
								"=",
								"lucid_oauth_grants.id",
							),
					)
					.as("scopes"),
			])
			.where("principal_type", "=", props.principalType)
			.orderBy("created_at", "desc");

		if (props.userId !== undefined) {
			query = query.where("user_id", "=", props.userId);
		}
		if (props.includeRevoked !== true) {
			query = query.where("revoked_at", "is", null);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleWithScopes",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [
				"id",
				"name",
				"client_id",
				"client_name",
				"client_uri",
				"principal_type",
				"user_id",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				"scopes",
			],
		});
	}
}
