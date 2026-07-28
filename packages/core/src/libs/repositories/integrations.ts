import { sql } from "kysely";
import z from "zod";
import type { GetAllQueryParams } from "../../schemas/integrations.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class IntegrationsRepository extends StaticRepository<"lucid_integrations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_integrations");
	}
	tableSchema = z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().nullable(),
		enabled: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		user_id: z.number().nullable(),
		tenant_key: z.string().nullable(),
		expires_at: z.union([z.string(), z.date()]).nullable(),
		scopes: z
			.array(
				z.object({
					scope: z.string(),
				}),
			)
			.optional(),
		key: z.string(),
		api_key: z.string(),
		secret: z.string(),
		last_used_at: z.union([z.string(), z.date()]).nullable(),
		last_used_ip: z.string().nullable(),
		last_used_user_agent: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		name: this.dbAdapter.getDataType("text"),
		description: this.dbAdapter.getDataType("text"),
		enabled: this.dbAdapter.getDataType("boolean"),
		user_id: this.dbAdapter.getDataType("integer"),
		tenant_key: this.dbAdapter.getDataType("text"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		key: this.dbAdapter.getDataType("text"),
		api_key: this.dbAdapter.getDataType("text"),
		secret: this.dbAdapter.getDataType("text"),
		last_used_at: this.dbAdapter.getDataType("timestamp"),
		last_used_ip: this.dbAdapter.getDataType("varchar", 255),
		last_used_user_agent: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				key: "key",
				name: "name",
				description: "description",
				enabled: "enabled",
				expiresAt: "expires_at",
				lastUsedAt: "last_used_at",
				lastUsedIp: "last_used_ip",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			sorts: {
				name: "name",
				description: "description",
				enabled: "enabled",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		operators: {
			name: "contains",
			description: "contains",
		},
	} as const;

	/**
	 * Selects an integration and its scopes by ID.
	 */
	async selectSingleByIdWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				tenantKey?: string | null;
				userId?: number | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_integrations")
			.select((eb) => [
				"id",
				"key",
				"name",
				"description",
				"enabled",
				"user_id",
				"tenant_key",
				"expires_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_integration_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_integration_scopes.integration_id",
								"=",
								"lucid_integrations.id",
							),
					)
					.as("scopes"),
			])
			.where("id", "=", props.id)
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_integrations.tenant_key",
				}),
			);

		if (props.userId !== undefined) {
			query =
				props.userId === null
					? query.where("user_id", "is", null)
					: query.where("user_id", "=", props.userId);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleByIdWithScopes",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"key",
				"name",
				"description",
				"enabled",
				"user_id",
				"tenant_key",
				"expires_at",
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
	 * Selects integration credentials and scopes by public key.
	 */
	async selectSingleByKeyWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				key: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_integrations")
			.select((eb) => [
				"id",
				"key",
				"api_key",
				"secret",
				"enabled",
				"user_id",
				"tenant_key",
				"expires_at",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_integration_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_integration_scopes.integration_id",
								"=",
								"lucid_integrations.id",
							),
					)
					.as("scopes"),
			])
			.where("key", "=", props.key);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleByKeyWithScopes",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"key",
				"api_key",
				"secret",
				"enabled",
				"user_id",
				"tenant_key",
				"expires_at",
				"scopes",
			],
		});
	}

	/**
	 * Selects filtered integrations with their scopes and total count.
	 */
	async selectMultipleFilteredWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetAllQueryParams;
				tenantKey?: string | null;
				userId?: number | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let mainQuery = this.db
					.selectFrom("lucid_integrations")
					.select((eb) => [
						"id",
						"key",
						"name",
						"description",
						"enabled",
						"user_id",
						"tenant_key",
						"expires_at",
						"last_used_at",
						"last_used_ip",
						"last_used_user_agent",
						"created_at",
						"updated_at",
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_integration_scopes")
									.select(["scope"])
									.whereRef(
										"lucid_integration_scopes.integration_id",
										"=",
										"lucid_integrations.id",
									),
							)
							.as("scopes"),
					])
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_integrations.tenant_key",
						}),
					);

				let countQuery = this.db
					.selectFrom("lucid_integrations")
					.select(sql`count(*)`.as("count"))
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_integrations.tenant_key",
						}),
					);

				if (props.userId !== undefined) {
					mainQuery =
						props.userId === null
							? mainQuery.where("user_id", "is", null)
							: mainQuery.where("user_id", "=", props.userId);
					countQuery =
						props.userId === null
							? countQuery.where("user_id", "is", null)
							: countQuery.where("user_id", "=", props.userId);
				}

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: {
							...this.queryConfig,
							customFilters: {
								scope: ({ eb, filter }) => {
									const values = Array.isArray(filter.value)
										? filter.value
										: [filter.value];
									return eb.exists(
										eb
											.selectFrom("lucid_integration_scopes")
											.select("lucid_integration_scopes.id")
											.whereRef(
												"lucid_integration_scopes.integration_id",
												"=",
												"lucid_integrations.id",
											)
											.where(
												"lucid_integration_scopes.scope",
												"in",
												values.map(String),
											),
									);
								},
							},
						},
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute(),
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{
				method: "selectMultipleFilteredWithScopes",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"key",
				"name",
				"description",
				"enabled",
				"user_id",
				"tenant_key",
				"expires_at",
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
