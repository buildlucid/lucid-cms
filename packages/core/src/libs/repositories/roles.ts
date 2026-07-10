import { sql } from "kysely";
import z from "zod";
import type { GetMultipleQueryParams } from "../../schemas/roles.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class RolesRepository extends StaticRepository<"lucid_roles"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_roles");
	}
	tableSchema = z.object({
		id: z.number(),
		key: z.string().nullable(),
		locked: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		tenant_key: z.string().nullable(),
		permissions: z
			.array(
				z.object({
					id: z.number(),
					role_id: z.number(),
					permission: z.string(),
				}),
			)
			.optional(),
		translations: z
			.array(
				z.object({
					name: z.string().nullable(),
					description: z.string().nullable(),
					locale_code: z.string(),
				}),
			)
			.optional(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		key: this.dbAdapter.getDataType("text"),
		locked: this.dbAdapter.getDataType("boolean"),
		tenant_key: this.dbAdapter.getDataType("text"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				name: "translation.name",
				description: "translation.description",
				roleIds: "lucid_roles.id",
				locked: "lucid_roles.locked",
				createdAt: "lucid_roles.created_at",
				updatedAt: "lucid_roles.updated_at",
			},
			sorts: {
				name: "translation.name",
				createdAt: "lucid_roles.created_at",
			},
		},
		operators: {
			name: this.dbAdapter.config.fuzzOperator,
			description: this.dbAdapter.config.fuzzOperator,
		},
	} as const;

	// ----------------------------------------
	// queries
	async selectMultipleIdsByIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
				tenantKey?: string | null;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_roles")
			.select("id")
			.where("id", "in", props.ids);

		query = queryBuilder.tenantScope(query, {
			tenantKey: props.tenantKey,
			column: "lucid_roles.tenant_key",
		});

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleIdsByIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			schema: this.tableSchema.pick({
				id: true,
			}),
			select: ["id"],
		});
	}

	async selectRoleIdByTranslationName<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				name: string;
				localeCode: string;
				tenantKey?: string | null;
				excludeRoleId?: number;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_roles")
			.innerJoin(
				"lucid_role_translations",
				"lucid_role_translations.role_id",
				"lucid_roles.id",
			)
			.select("lucid_roles.id as role_id")
			.where("lucid_role_translations.name", "=", props.name)
			.where("lucid_role_translations.locale_code", "=", props.localeCode);

		if (props.excludeRoleId !== undefined) {
			query = query.where("lucid_roles.id", "!=", props.excludeRoleId);
		}

		query = queryBuilder.tenantScope(query, {
			tenantKey: props.tenantKey,
			column: "lucid_roles.tenant_key",
		});

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectRoleIdByTranslationName",
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
				tenantKey?: string | null;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_roles")
			.select((eb) => [
				"id",
				"key",
				"locked",
				"tenant_key",
				"created_at",
				"updated_at",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_role_translations")
							.select([
								"lucid_role_translations.name",
								"lucid_role_translations.description",
								"lucid_role_translations.locale_code",
							])
							.whereRef(
								"lucid_role_translations.role_id",
								"=",
								"lucid_roles.id",
							),
					)
					.as("translations"),
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
			.where("id", "=", props.id)
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_roles.tenant_key",
				}),
			);

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
				"locked",
				"tenant_key",
				"created_at",
				"updated_at",
				"translations",
				"permissions",
			],
		});
	}
	async selectMultipleFilteredFixed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: GetMultipleQueryParams;
				tenantKey?: string | null;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_roles")
					.leftJoin("lucid_role_translations as translation", (join) =>
						join.onRef("translation.role_id", "=", "lucid_roles.id"),
					)
					.select([
						"lucid_roles.id",
						"lucid_roles.key",
						"lucid_roles.locked",
						"lucid_roles.tenant_key",
						"lucid_roles.created_at",
						"lucid_roles.updated_at",
					])
					.select((eb) => [
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_role_translations")
									.select([
										"lucid_role_translations.name",
										"lucid_role_translations.description",
										"lucid_role_translations.locale_code",
									])
									.whereRef(
										"lucid_role_translations.role_id",
										"=",
										"lucid_roles.id",
									),
							)
							.as("translations"),
					])
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
					)
					.groupBy("lucid_roles.id")
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_roles.tenant_key",
						}),
					);

				const countQuery = this.db
					.selectFrom("lucid_roles")
					.select(sql`count(distinct lucid_roles.id)`.as("count"))
					.leftJoin("lucid_role_translations as translation", (join) =>
						join.onRef("translation.role_id", "=", "lucid_roles.id"),
					)
					.$call((qb) =>
						queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_roles.tenant_key",
						}),
					);

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						meta: {
							tableKeys: {
								filters: {
									...this.queryConfig.tableKeys.filters,
									name: "translation.name",
								},
								sorts: this.queryConfig.tableKeys.sorts,
							},
							operators: this.queryConfig.operators,
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
				"locked",
				"tenant_key",
				"created_at",
				"updated_at",
				"translations",
				"permissions",
			],
		});
	}
}
