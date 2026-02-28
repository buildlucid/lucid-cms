import { sql } from "kysely";
import z from "zod";
import type { GetAllQueryParams } from "../../schemas/client-integrations.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import queryBuilder from "../query-builder/index.js";
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
		last_used_at: this.dbAdapter.getDataType("timestamp"),
		last_used_ip: this.dbAdapter.getDataType("varchar", 255),
		last_used_user_agent: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				name: "name",
				description: "description",
				enabled: "enabled",
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
			name: this.dbAdapter.config.fuzzOperator,
			description: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

	async selectSingleByIdWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
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
			.where("id", "=", props.id);

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
					]);

				const countQuery = this.db
					.selectFrom("lucid_client_integrations")
					.select(sql`count(*)`.as("count"));

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						meta: this.queryConfig,
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
