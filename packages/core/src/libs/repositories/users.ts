import z from "zod";
import { sql } from "kysely";
import StaticRepository from "./parents/static-repository.js";
import queryBuilder from "../query-builder/index.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { QueryProps } from "./types.js";
import type usersSchema from "../../schemas/users.js";
import type { Select, KyselyDB } from "../db/types.js";
import type { LucidUsers } from "../db/types.js";

export default class UsersRepository extends StaticRepository<"lucid_users"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_users");
	}
	tableSchema = z.object({
		id: z.number(),
		super_admin: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		email: z.string().email(),
		username: z.string(),
		first_name: z.string().nullable(),
		last_name: z.string().nullable(),
		password: z.string().nullable(),
		secret: z.string(),
		triggered_password_reset: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.string().nullable(),
		deleted_by: z.number().nullable(),
		roles: z
			.array(
				z.object({
					id: z.number(),
					description: z.string().nullable(),
					name: z.string(),
					permissions: z
						.array(
							z.object({
								permission: z.string(),
							}),
						)
						.optional(),
				}),
			)
			.optional(),
		created_at: z.string().nullable(),
		updated_at: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		super_admin: this.dbAdapter.getDataType("boolean"),
		email: this.dbAdapter.getDataType("text"),
		username: this.dbAdapter.getDataType("text"),
		first_name: this.dbAdapter.getDataType("text"),
		last_name: this.dbAdapter.getDataType("text"),
		password: this.dbAdapter.getDataType("text"),
		secret: this.dbAdapter.getDataType("text"),
		triggered_password_reset: this.dbAdapter.getDataType("boolean"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		deleted_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				firstName: "lucid_users.first_name",
				lastName: "lucid_users.last_name",
				email: "lucid_users.email",
				username: "lucid_users.username",
				roleIds: "lucid_user_roles.role_id",
				id: "lucid_users.id",
			},
			sorts: {
				createdAt: "lucid_users.created_at",
				updatedAt: "lucid_users.updated_at",
				firstName: "lucid_users.first_name",
				lastName: "lucid_users.last_name",
				email: "lucid_users.email",
				username: "lucid_users.username",
			},
		},
		operators: {
			firstName: this.dbAdapter.config.fuzzOperator,
			lastName: this.dbAdapter.config.fuzzOperator,
			email: this.dbAdapter.config.fuzzOperator,
			username: this.dbAdapter.config.fuzzOperator,
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
			.selectFrom("lucid_users")
			.select((eb) => [
				"email",
				"first_name",
				"last_name",
				"id",
				"created_at",
				"updated_at",
				"username",
				"super_admin",
				"triggered_password_reset",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_user_roles")
							.innerJoin(
								"lucid_roles",
								"lucid_roles.id",
								"lucid_user_roles.role_id",
							)
							.select((eb) => [
								"lucid_roles.id",
								"lucid_roles.name",
								"lucid_roles.description",
								this.dbAdapter
									.jsonArrayFrom(
										eb
											.selectFrom("lucid_role_permissions")
											.select(["permission"])
											.whereRef("role_id", "=", "lucid_roles.id"),
									)
									.as("permissions"),
							])
							.whereRef("user_id", "=", "lucid_users.id"),
					)
					.as("roles"),
			])
			.where("id", "=", props.id)
			.where("is_deleted", "=", this.dbAdapter.getDefault("boolean", "false"));

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"email",
				"first_name",
				"last_name",
				"id",
				"created_at",
				"updated_at",
				"username",
				"super_admin",
				"triggered_password_reset",
				"roles",
			],
		});
	}
	async selectSingleByEmailUsername<
		K extends keyof Select<LucidUsers>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				where: {
					username: string;
					email: string;
				};
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_users")
			.select(props.select)
			.where((eb) =>
				eb.or([
					eb("username", "=", props.where.username),
					eb("email", "=", props.where.email),
				]),
			);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidUsers>, K> | undefined
				>,
			{
				method: "selectSingleByEmailUsername",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.select,
		});
	}
	async selectMultipleFilteredFixed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: z.infer<typeof usersSchema.getMultiple.query>;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_users")
					.select((eb) => [
						"lucid_users.email",
						"lucid_users.first_name",
						"lucid_users.last_name",
						"lucid_users.id",
						"lucid_users.created_at",
						"lucid_users.updated_at",
						"lucid_users.username",
						"lucid_users.super_admin",
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_user_roles")
									.innerJoin(
										"lucid_roles",
										"lucid_roles.id",
										"lucid_user_roles.role_id",
									)
									.select([
										"lucid_roles.id",
										"lucid_roles.name",
										"lucid_roles.description",
									])
									.whereRef("user_id", "=", "lucid_users.id"),
							)
							.as("roles"),
					])
					.leftJoin("lucid_user_roles", (join) =>
						join.onRef("lucid_user_roles.user_id", "=", "lucid_users.id"),
					)
					.where(
						"lucid_users.is_deleted",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					)
					.groupBy("lucid_users.id");

				const countQuery = this.db
					.selectFrom("lucid_users")
					.select(sql`count(distinct lucid_users.id)`.as("count"))
					.leftJoin("lucid_user_roles", (join) =>
						join.onRef("lucid_user_roles.user_id", "=", "lucid_users.id"),
					)
					.where(
						"lucid_users.is_deleted",
						"=",
						this.dbAdapter.getDefault("boolean", "false"),
					);

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
				"email",
				"first_name",
				"last_name",
				"id",
				"created_at",
				"updated_at",
				"username",
				"super_admin",
				"roles",
			],
		});
	}
}
