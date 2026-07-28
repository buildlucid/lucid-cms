import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB, OAuthPrincipalType } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class OAuthGrantsRepository extends StaticRepository<"lucid_oauth_grants"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_oauth_grants");
	}
	tableSchema = z.object({
		id: z.number(),
		name: z.string(),
		client_id: z.string(),
		client_name: z.string(),
		client_uri: z.string().nullable(),
		principal_type: z.enum(["system", "user"]),
		user_id: z.number().nullable(),
		tenant_key: z.string().nullable(),
		created_by: z.number().nullable(),
		revoked_at: z.union([z.string(), z.date()]).nullable(),
		last_used_at: z.union([z.string(), z.date()]).nullable(),
		last_used_ip: z.string().nullable(),
		last_used_user_agent: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		scopes: z
			.array(
				z.object({
					scope: z.string(),
				}),
			)
			.optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		name: this.dbAdapter.getDataType("text"),
		client_id: this.dbAdapter.getDataType("text"),
		client_name: this.dbAdapter.getDataType("text"),
		client_uri: this.dbAdapter.getDataType("text"),
		principal_type: this.dbAdapter.getDataType("text"),
		user_id: this.dbAdapter.getDataType("integer"),
		tenant_key: this.dbAdapter.getDataType("text"),
		created_by: this.dbAdapter.getDataType("integer"),
		revoked_at: this.dbAdapter.getDataType("timestamp"),
		last_used_at: this.dbAdapter.getDataType("timestamp"),
		last_used_ip: this.dbAdapter.getDataType("varchar", 255),
		last_used_user_agent: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

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
				"tenant_key",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.dbAdapter
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
				"tenant_key",
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
				tenantKey?: string | null;
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
				"tenant_key",
				"created_by",
				"revoked_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.dbAdapter
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
			.orderBy("created_at", "desc")
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_oauth_grants.tenant_key",
				}),
			);

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
				"tenant_key",
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
