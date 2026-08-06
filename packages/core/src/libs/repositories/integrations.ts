import { sql } from "kysely";
import type { GetAllQueryParams } from "../../schemas/integrations.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { integrationsTable } from "../db/tables/integrations.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class IntegrationsRepository extends StaticRepository<"lucid_integrations"> {
	constructor(db: LucidDatabase) {
		super(db, integrationsTable);
	}

	/**
	 * Selects an integration and its scopes by ID.
	 */
	async selectSingleByIdWithScopes<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
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
				"expires_at",
				"last_used_at",
				"last_used_ip",
				"last_used_user_agent",
				"created_at",
				"updated_at",
				this.database.fn
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
			.where("id", "=", props.id);

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
				"expires_at",
				this.database.fn
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
						"expires_at",
						"last_used_at",
						"last_used_ip",
						"last_used_user_agent",
						"created_at",
						"updated_at",
						this.database.fn
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
					]);

				let countQuery = this.db
					.selectFrom("lucid_integrations")
					.select(sql`count(*)`.as("count"));

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
							...this.config.queryConfig,
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
