import { sql } from "kysely";
import z from "zod";
import type { GetMultipleQueryParams } from "../../schemas/roles.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { rolesTable } from "../db/tables/roles.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class RolesRepository extends StaticRepository<"lucid_roles"> {
	constructor(db: LucidDatabase) {
		super(db, rolesTable);
	}

	// ----------------------------------------
	// queries
	async selectMultipleIdsByIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_roles")
			.select("id")
			.where("id", "in", props.ids);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleIdsByIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			schema: this.config.schema.pick({
				id: true,
			}),
			select: ["id"],
		});
	}

	async selectRoleIdByName<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				name: string;
				excludeRoleId?: number;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_roles")
			.select("lucid_roles.id as role_id")
			.where("lucid_roles.name", "=", props.name);

		if (props.excludeRoleId !== undefined) {
			query = query.where("lucid_roles.id", "!=", props.excludeRoleId);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectRoleIdByName",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			schema: z.object({
				role_id: z.number(),
			}),
			select: ["role_id"],
		});
	}

	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_roles")
			.select((eb) => [
				"id",
				"key",
				"name",
				"description",
				"locked",
				"created_at",
				"updated_at",

				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_role_permissions")
							.select([
								"lucid_role_permissions.id",
								"lucid_role_permissions.permission",
								"lucid_role_permissions.role_id",
							])
							.whereRef(
								"lucid_role_permissions.role_id",
								"=",
								"lucid_roles.id",
							),
					)
					.as("permissions"),
			])
			.where("id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
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
				"locked",
				"created_at",
				"updated_at",
				"permissions",
			],
		});
	}
	async selectMultipleFilteredFixed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetMultipleQueryParams;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_roles")
					.select([
						"lucid_roles.id",
						"lucid_roles.key",
						"lucid_roles.name",
						"lucid_roles.description",
						"lucid_roles.locked",
						"lucid_roles.created_at",
						"lucid_roles.updated_at",
					])
					.$if(
						props.queryParams.include?.includes("permissions") || false,
						(qb) =>
							qb.select((eb) => [
								this.database.fn
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_role_permissions")
											.select([
												"lucid_role_permissions.id",
												"lucid_role_permissions.permission",
												"lucid_role_permissions.role_id",
											])
											.whereRef(
												"lucid_role_permissions.role_id",
												"=",
												"lucid_roles.id",
											),
									)
									.as("permissions"),
							]),
					);

				const countQuery = this.db
					.selectFrom("lucid_roles")
					.select(sql`count(distinct lucid_roles.id)`.as("count"));

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: {
							tableKeys: {
								filters: {
									...this.config.queryConfig.tableKeys.filters,
									name: "lucid_roles.name",
								},
								sorts: this.config.queryConfig.tableKeys.sorts,
							},
							operators: this.config.queryConfig.operators,
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
				method: "selectMultipleFilteredFixed",
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
				"locked",
				"created_at",
				"updated_at",
				"permissions",
			],
		});
	}
}
