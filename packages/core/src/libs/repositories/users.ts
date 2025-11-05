import { sql } from "kysely";
import z from "zod/v4";
import type { GetMultipleQueryParams } from "../../schemas/users.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB, LucidUsers, Select } from "../db-adapter/types.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

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
		email: z.email(),
		username: z.string(),
		first_name: z.string().nullable(),
		last_name: z.string().nullable(),
		password: z.string().nullable(),
		secret: z.string(),
		triggered_password_reset: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		invitation_accepted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_locked: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).nullable(),
		deleted_by: z.number().nullable(),
		auth_providers: z
			.array(
				z.object({
					id: z.number(),
					provider_key: z.string(),
					provider_user_id: z.string(),
					linked_at: z.union([z.string(), z.date()]).nullable(),
				}),
			)
			.optional(),
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
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
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
		invitation_accepted: this.dbAdapter.getDataType("boolean"),
		is_locked: this.dbAdapter.getDataType("boolean"),
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
				invitationAccepted: "lucid_users.invitation_accepted",
				isLocked: "lucid_users.is_locked",
				isDeleted: "lucid_users.is_deleted",
				deletedBy: "lucid_users.deleted_by",
			},
			sorts: {
				createdAt: "lucid_users.created_at",
				updatedAt: "lucid_users.updated_at",
				firstName: "lucid_users.first_name",
				lastName: "lucid_users.last_name",
				email: "lucid_users.email",
				username: "lucid_users.username",
				isLocked: "lucid_users.is_locked",
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
	async selectAccessTokenUser<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<"lucid_users">;
			}
		>,
	) {
		let query = this.db.selectFrom("lucid_users").select((eb) => [
			"id",
			"username",
			"email",
			"super_admin",
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
		]);

		query = queryBuilder.select(query, props.where);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectAccessTokenUser",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: ["id", "username", "email", "super_admin", "roles"],
		});
	}
	async selectSinglePreset<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<"lucid_users">;
			}
		>,
	) {
		let query = this.db.selectFrom("lucid_users").select((eb) => [
			"email",
			"first_name",
			"last_name",
			"id",
			"created_at",
			"updated_at",
			"username",
			"super_admin",
			"triggered_password_reset",
			"invitation_accepted",
			"is_locked",
			"is_deleted",
			"is_deleted_at",
			"password",
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
			this.dbAdapter
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_user_auth_providers")
						.select([
							"lucid_user_auth_providers.id",
							"lucid_user_auth_providers.provider_key",
							"lucid_user_auth_providers.provider_user_id",
							"lucid_user_auth_providers.linked_at",
						])
						.whereRef(
							"lucid_user_auth_providers.user_id",
							"=",
							"lucid_users.id",
						),
				)
				.as("auth_providers"),
		]);

		query = queryBuilder.select(query, props.where);

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
				"invitation_accepted",
				"is_locked",
				"password",
				"roles",
				"auth_providers",
			],
		});
	}
	async selectMultipleByIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				ids: number[];
				where?: QueryBuilderWhere<"lucid_users">;
			}
		>,
	) {
		let query = this.db
			.selectFrom("lucid_users")
			.select([
				"email",
				"first_name",
				"last_name",
				"id",
				"created_at",
				"updated_at",
				"username",
				"super_admin",
				"is_locked",
				"is_deleted",
				"is_deleted_at",
				"invitation_accepted",
			])
			.where("id", "in", props.ids);

		if (props.where !== undefined && props.where.length > 0) {
			query = queryBuilder.select(query, props.where);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleByIds",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [
				"email",
				"first_name",
				"last_name",
				"id",
				"created_at",
				"updated_at",
				"username",
				"super_admin",
				"invitation_accepted",
				"is_locked",
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
				queryParams: GetMultipleQueryParams;
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
						"lucid_users.is_locked",
						"lucid_users.is_deleted",
						"lucid_users.is_deleted_at",
						"lucid_users.invitation_accepted",
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
					.groupBy("lucid_users.id");

				const countQuery = this.db
					.selectFrom("lucid_users")
					.select(sql`count(distinct lucid_users.id)`.as("count"))
					.leftJoin("lucid_user_roles", (join) =>
						join.onRef("lucid_user_roles.user_id", "=", "lucid_users.id"),
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
				"is_locked",
				"roles",
				"invitation_accepted",
			],
		});
	}
}
