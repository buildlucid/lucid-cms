import { sql } from "kysely";
import z from "zod/v4";
import type { GetMultipleQueryParams } from "../../schemas/roles.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import queryBuilder from "../query-builder/index.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class RolesRepository extends StaticRepository<"lucid_roles"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_roles");
	}
	tableSchema = z.object({
		id: z.number(),
		name: z.string(),
		description: z.string().nullable(),
		permissions: z
			.array(
				z.object({
					id: z.number(),
					role_id: z.number(),
					permission: z.string(),
				}),
			)
			.optional(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		name: this.dbAdapter.getDataType("text"),
		description: this.dbAdapter.getDataType("text"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				name: "name",
				roleIds: "id",
			},
			sorts: {
				name: "name",
				createdAt: "created_at",
			},
		},
		operators: {
			name: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

	// ----------------------------------------
	// queries
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
				"name",
				"created_at",
				"updated_at",
				"description",
				this.dbAdapter
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
				"name",
				"created_at",
				"updated_at",
				"description",
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
					.select(["id", "name", "created_at", "updated_at", "description"])
					.$if(
						props.queryParams.include?.includes("permissions") || false,
						(qb) =>
							qb.select((eb) => [
								this.dbAdapter
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
				method: "selectMultipleFilteredFixed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"name",
				"created_at",
				"updated_at",
				"description",
				"permissions",
			],
		});
	}
}
