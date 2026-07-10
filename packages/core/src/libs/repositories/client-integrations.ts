import { sql } from "kysely";
import z from "zod";
import type { GetAllQueryParams } from "../../schemas/client-integrations.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class ClientIntegrationsRepository extends StaticRepository<"lucid_client_integrations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_client_integrations");
	}
	tableSchema = z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().nullable(),
		enabled: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
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
		tenant_key: z.string().nullable(),
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
		key: this.dbAdapter.getDataType("text"),
		api_key: this.dbAdapter.getDataType("text"),
		secret: this.dbAdapter.getDataType("text"),
		tenant_key: this.dbAdapter.getDataType("text"),
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

	async selectSingleByIdWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				tenantKey?: string | null;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_client_integrations")
			.select((eb) => [
				"id",
				"key",
				"name",
				"description",
				"enabled",
				"tenant_key",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_client_integration_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_client_integration_scopes.client_integration_id",
								"=",
								"lucid_client_integrations.id",
							),
					)
					.as("scopes"),
			])
			.where("id", "=", props.id)
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_client_integrations.tenant_key",
				}),
			);

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
				"tenant_key",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				"scopes",
			],
		});
	}

	async selectSingleByKeyWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				key: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_client_integrations")
			.select((eb) => [
				"id",
				"key",
				"api_key",
				"secret",
				"enabled",
				"tenant_key",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_client_integration_scopes")
							.select(["scope"])
							.whereRef(
								"lucid_client_integration_scopes.client_integration_id",
								"=",
								"lucid_client_integrations.id",
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
			select: ["id", "key", "api_key", "secret", "enabled", "scopes"],
		});
	}

	async selectMultipleFilteredWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetAllQueryParams;
				tenantKey?: string | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_client_integrations")
					.select((eb) => [
						"id",
						"key",
						"name",
						"description",
						"enabled",
						"tenant_key",
						"last_used_at",
						"last_used_ip",
						"last_used_user_agent",
						"created_at",
						"updated_at",
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_client_integration_scopes")
									.select(["scope"])
									.whereRef(
										"lucid_client_integration_scopes.client_integration_id",
										"=",
										"lucid_client_integrations.id",
									),
							)
							.as("scopes"),
					])
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_client_integrations.tenant_key",
						}),
					);

				const countQuery = this.db
					.selectFrom("lucid_client_integrations")
					.select(sql`count(*)`.as("count"))
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_client_integrations.tenant_key",
						}),
					);

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
											.selectFrom("lucid_client_integration_scopes")
											.select("lucid_client_integration_scopes.id")
											.whereRef(
												"lucid_client_integration_scopes.client_integration_id",
												"=",
												"lucid_client_integrations.id",
											)
											.where(
												"lucid_client_integration_scopes.scope",
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
				"tenant_key",
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
