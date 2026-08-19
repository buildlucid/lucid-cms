import { sql } from "kysely";
import type { GetMultipleQueryParams } from "../../schemas/users.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../db/query-builder/index.js";
import type { LucidUsers } from "../db/tables/index.js";
import { usersTable } from "../db/tables/users.js";
import type { Select } from "../db/types.js";
import { mediaImageSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class UsersRepository extends StaticRepository<"lucid_users"> {
	constructor(db: LucidDatabase) {
		super(db, usersTable);
	}

	// ----------------------------------------
	// queries

	async selectSingleContentAccount<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				userId: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_users")
			.select(["id", "username", "email", "first_name", "last_name"])
			.select(() => [
				mediaImageSelect(
					this.database,
					"lucid_users.profile_picture_media_id",
					"content_profile_picture",
				),
			])
			.where("id", "=", props.userId)
			.where("is_deleted", "=", this.dbAdapter.getDefault("boolean", "false"))
			.where("is_locked", "=", this.dbAdapter.getDefault("boolean", "false"));

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleContentAccount",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"username",
				"email",
				"first_name",
				"last_name",
				"content_profile_picture",
			],
		});
	}

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
			this.database.fn
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
							this.database.fn
								.jsonArrayFrom(
									eb
										.selectFrom("lucid_role_translations")
										.select([
											"lucid_role_translations.name",
											"lucid_role_translations.locale_code",
										])
										.whereRef(
											"lucid_role_translations.role_id",
											"=",
											"lucid_roles.id",
										),
								)
								.as("translations"),
							this.database.fn
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
	async selectAuditActorById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				defaultLocale: string;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_users")
			.select((eb) => [
				"id",
				"super_admin",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_user_roles")
							.innerJoin(
								"lucid_roles",
								"lucid_roles.id",
								"lucid_user_roles.role_id",
							)
							.leftJoin("lucid_role_translations as translation", (join) =>
								join
									.onRef("translation.role_id", "=", "lucid_roles.id")
									.on("translation.locale_code", "=", props.defaultLocale),
							)
							.select(["lucid_roles.id", "translation.name"])
							.whereRef("user_id", "=", "lucid_users.id")
							.orderBy("lucid_roles.id", "asc"),
					)
					.as("roles"),
			])
			.where("id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectAuditActorById",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: ["id", "super_admin", "roles"],
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
			this.database.fn
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
							this.database.fn
								.jsonArrayFrom(
									eb
										.selectFrom("lucid_role_translations")
										.select([
											"lucid_role_translations.name",
											"lucid_role_translations.locale_code",
										])
										.whereRef(
											"lucid_role_translations.role_id",
											"=",
											"lucid_roles.id",
										),
								)
								.as("translations"),
							this.database.fn
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
			this.database.fn
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
			this.database.fn
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_media")
						.select((mediaEb) => [
							"lucid_media.id",
							"lucid_media.key",
							"lucid_media.status",
							"lucid_media.storage_adapter_key",
							"lucid_media.storage_adapter_reference",
							"lucid_media.storage_adapter_data",
							"lucid_media.public",
							"lucid_media.origin",
							"lucid_media.folder_id",
							"lucid_media.e_tag",
							"lucid_media.type",
							"lucid_media.mime_type",
							"lucid_media.file_extension",
							"lucid_media.file_name",
							"lucid_media.file_size",
							"lucid_media.width",
							"lucid_media.height",
							"lucid_media.duration",
							"lucid_media.focal_x",
							"lucid_media.focal_y",
							"lucid_media.created_at",
							"lucid_media.updated_at",
							"lucid_media.blur_hash",
							"lucid_media.average_color",
							"lucid_media.base64",
							"lucid_media.is_dark",
							"lucid_media.is_light",
							"lucid_media.is_deleted",
							"lucid_media.is_deleted_at",
							"lucid_media.deleted_by",
							this.database.fn
								.jsonArrayFrom(
									mediaEb
										.selectFrom("lucid_media as profile_crop")
										.select([
											"profile_crop.id",
											"profile_crop.key",
											"profile_crop.status",
											"profile_crop.storage_adapter_key",
											"profile_crop.storage_adapter_reference",
											"profile_crop.storage_adapter_data",
											"profile_crop.public",
											"profile_crop.origin",
											"profile_crop.type",
											"profile_crop.mime_type",
											"profile_crop.file_extension",
											"profile_crop.file_name",
											"profile_crop.file_size",
											"profile_crop.width",
											"profile_crop.height",
											"profile_crop.focal_x",
											"profile_crop.focal_y",
											"profile_crop.crop_x",
											"profile_crop.crop_y",
											"profile_crop.crop_width",
											"profile_crop.crop_height",
											"profile_crop.crop_rotation",
											"profile_crop.crop_skew_x",
											"profile_crop.crop_skew_y",
											"profile_crop.blur_hash",
											"profile_crop.average_color",
											"profile_crop.base64",
											"profile_crop.is_dark",
											"profile_crop.is_light",
										])
										.where(
											"profile_crop.parent_media_id",
											"=",
											sql.ref<number>("lucid_media.id"),
										)
										.where("profile_crop.relation_type", "=", "crop")
										.where(
											"profile_crop.is_deleted",
											"=",
											this.dbAdapter.getDefault("boolean", "false"),
										),
								)
								.as("crop"),
							this.database.fn
								.jsonArrayFrom(
									mediaEb
										.selectFrom("lucid_media_translations")
										.select([
											"lucid_media_translations.title",
											"lucid_media_translations.alt",
											"lucid_media_translations.description",
											"lucid_media_translations.summary",
											"lucid_media_translations.locale_code",
										])
										.whereRef(
											"lucid_media_translations.media_id",
											"=",
											"lucid_media.id",
										),
								)
								.as("translations"),
						])
						.whereRef(
							"lucid_media.id",
							"=",
							"lucid_users.profile_picture_media_id",
						)
						.where(
							"lucid_media.is_deleted",
							"=",
							this.dbAdapter.getDefault("boolean", "false"),
						),
				)
				.as("profile_picture"),
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
				"profile_picture",
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
			.select((eb) => [
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
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media")
							.select((mediaEb) => [
								"lucid_media.id",
								"lucid_media.key",
								"lucid_media.status",
								"lucid_media.storage_adapter_key",
								"lucid_media.storage_adapter_reference",
								"lucid_media.storage_adapter_data",
								"lucid_media.public",
								"lucid_media.origin",
								"lucid_media.folder_id",
								"lucid_media.e_tag",
								"lucid_media.type",
								"lucid_media.mime_type",
								"lucid_media.file_extension",
								"lucid_media.file_name",
								"lucid_media.file_size",
								"lucid_media.width",
								"lucid_media.height",
								"lucid_media.duration",
								"lucid_media.focal_x",
								"lucid_media.focal_y",
								"lucid_media.created_at",
								"lucid_media.updated_at",
								"lucid_media.blur_hash",
								"lucid_media.average_color",
								"lucid_media.base64",
								"lucid_media.is_dark",
								"lucid_media.is_light",
								"lucid_media.is_deleted",
								"lucid_media.is_deleted_at",
								"lucid_media.deleted_by",
								this.database.fn
									.jsonArrayFrom(
										mediaEb
											.selectFrom("lucid_media as profile_crop")
											.select([
												"profile_crop.id",
												"profile_crop.key",
												"profile_crop.status",
												"profile_crop.storage_adapter_key",
												"profile_crop.storage_adapter_reference",
												"profile_crop.storage_adapter_data",
												"profile_crop.public",
												"profile_crop.origin",
												"profile_crop.type",
												"profile_crop.mime_type",
												"profile_crop.file_extension",
												"profile_crop.file_name",
												"profile_crop.file_size",
												"profile_crop.width",
												"profile_crop.height",
												"profile_crop.focal_x",
												"profile_crop.focal_y",
												"profile_crop.crop_x",
												"profile_crop.crop_y",
												"profile_crop.crop_width",
												"profile_crop.crop_height",
												"profile_crop.crop_rotation",
												"profile_crop.crop_skew_x",
												"profile_crop.crop_skew_y",
												"profile_crop.blur_hash",
												"profile_crop.average_color",
												"profile_crop.base64",
												"profile_crop.is_dark",
												"profile_crop.is_light",
											])
											.where(
												"profile_crop.parent_media_id",
												"=",
												sql.ref<number>("lucid_media.id"),
											)
											.where("profile_crop.relation_type", "=", "crop")
											.where(
												"profile_crop.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("crop"),
								this.database.fn
									.jsonArrayFrom(
										mediaEb
											.selectFrom("lucid_media_translations")
											.select([
												"lucid_media_translations.title",
												"lucid_media_translations.alt",
												"lucid_media_translations.description",
												"lucid_media_translations.summary",
												"lucid_media_translations.locale_code",
											])
											.whereRef(
												"lucid_media_translations.media_id",
												"=",
												"lucid_media.id",
											),
									)
									.as("translations"),
							])
							.whereRef(
								"lucid_media.id",
								"=",
								"lucid_users.profile_picture_media_id",
							)
							.where(
								"lucid_media.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("profile_picture"),
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
				"profile_picture",
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
						"lucid_users.password",
						"lucid_users.triggered_password_reset",
						"lucid_users.is_locked",
						"lucid_users.is_deleted",
						"lucid_users.is_deleted_at",
						"lucid_users.invitation_accepted",
						this.database.fn
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
										this.database.fn
											.jsonArrayFrom(
												eb
													.selectFrom("lucid_role_translations")
													.select([
														"lucid_role_translations.name",
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
									.whereRef("user_id", "=", "lucid_users.id"),
							)
							.as("roles"),
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select((mediaEb) => [
										"lucid_media.id",
										"lucid_media.key",
										"lucid_media.status",
										"lucid_media.storage_adapter_key",
										"lucid_media.storage_adapter_reference",
										"lucid_media.storage_adapter_data",
										"lucid_media.public",
										"lucid_media.origin",
										"lucid_media.folder_id",
										"lucid_media.e_tag",
										"lucid_media.type",
										"lucid_media.mime_type",
										"lucid_media.file_extension",
										"lucid_media.file_name",
										"lucid_media.file_size",
										"lucid_media.width",
										"lucid_media.height",
										"lucid_media.duration",
										"lucid_media.focal_x",
										"lucid_media.focal_y",
										"lucid_media.created_at",
										"lucid_media.updated_at",
										"lucid_media.blur_hash",
										"lucid_media.average_color",
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										"lucid_media.is_deleted",
										"lucid_media.is_deleted_at",
										"lucid_media.deleted_by",
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media as profile_crop")
													.select([
														"profile_crop.id",
														"profile_crop.key",
														"profile_crop.status",
														"profile_crop.storage_adapter_key",
														"profile_crop.storage_adapter_reference",
														"profile_crop.storage_adapter_data",
														"profile_crop.public",
														"profile_crop.origin",
														"profile_crop.type",
														"profile_crop.mime_type",
														"profile_crop.file_extension",
														"profile_crop.file_name",
														"profile_crop.file_size",
														"profile_crop.width",
														"profile_crop.height",
														"profile_crop.focal_x",
														"profile_crop.focal_y",
														"profile_crop.crop_x",
														"profile_crop.crop_y",
														"profile_crop.crop_width",
														"profile_crop.crop_height",
														"profile_crop.crop_rotation",
														"profile_crop.crop_skew_x",
														"profile_crop.crop_skew_y",
														"profile_crop.blur_hash",
														"profile_crop.average_color",
														"profile_crop.base64",
														"profile_crop.is_dark",
														"profile_crop.is_light",
													])
													.where(
														"profile_crop.parent_media_id",
														"=",
														sql.ref<number>("lucid_media.id"),
													)
													.where("profile_crop.relation_type", "=", "crop")
													.where(
														"profile_crop.is_deleted",
														"=",
														this.dbAdapter.getDefault("boolean", "false"),
													),
											)
											.as("crop"),
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media_translations")
													.select([
														"lucid_media_translations.title",
														"lucid_media_translations.alt",
														"lucid_media_translations.description",
														"lucid_media_translations.summary",
														"lucid_media_translations.locale_code",
													])
													.whereRef(
														"lucid_media_translations.media_id",
														"=",
														"lucid_media.id",
													),
											)
											.as("translations"),
									])
									.whereRef(
										"lucid_media.id",
										"=",
										"lucid_users.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("profile_picture"),
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
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
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
				"password",
				"triggered_password_reset",
				"is_locked",
				"roles",
				"invitation_accepted",
				"profile_picture",
			],
		});
	}

	async selectMultiplePublishReviewers<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				permission: string;
			}
		>,
	) {
		const exec = await this.executeQuery(
			() => {
				const superAdminValue = this.dbAdapter.getDefault("boolean", "true");
				const deletedValue = this.dbAdapter.getDefault("boolean", "false");
				const lockedValue = this.dbAdapter.getDefault("boolean", "false");

				return this.db
					.selectFrom("lucid_users")
					.select((eb) => [
						"id",
						"email",
						"username",
						"first_name as firstName",
						"last_name as lastName",
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select((mediaEb) => [
										"lucid_media.id",
										"lucid_media.key",
										"lucid_media.status",
										"lucid_media.storage_adapter_key",
										"lucid_media.storage_adapter_reference",
										"lucid_media.storage_adapter_data",
										"lucid_media.public",
										"lucid_media.origin",
										"lucid_media.type",
										"lucid_media.mime_type",
										"lucid_media.file_extension",
										"lucid_media.file_name",
										"lucid_media.file_size",
										"lucid_media.width",
										"lucid_media.height",
										"lucid_media.duration",
										"lucid_media.focal_x",
										"lucid_media.focal_y",
										"lucid_media.blur_hash",
										"lucid_media.average_color",
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media as profile_crop")
													.select([
														"profile_crop.id",
														"profile_crop.key",
														"profile_crop.status",
														"profile_crop.storage_adapter_key",
														"profile_crop.storage_adapter_reference",
														"profile_crop.storage_adapter_data",
														"profile_crop.public",
														"profile_crop.origin",
														"profile_crop.type",
														"profile_crop.mime_type",
														"profile_crop.file_extension",
														"profile_crop.file_name",
														"profile_crop.file_size",
														"profile_crop.width",
														"profile_crop.height",
														"profile_crop.focal_x",
														"profile_crop.focal_y",
														"profile_crop.crop_x",
														"profile_crop.crop_y",
														"profile_crop.crop_width",
														"profile_crop.crop_height",
														"profile_crop.crop_rotation",
														"profile_crop.crop_skew_x",
														"profile_crop.crop_skew_y",
														"profile_crop.blur_hash",
														"profile_crop.average_color",
														"profile_crop.base64",
														"profile_crop.is_dark",
														"profile_crop.is_light",
													])
													.where(
														"profile_crop.parent_media_id",
														"=",
														sql.ref<number>("lucid_media.id"),
													)
													.where("profile_crop.relation_type", "=", "crop")
													.where(
														"profile_crop.is_deleted",
														"=",
														this.dbAdapter.getDefault("boolean", "false"),
													),
											)
											.as("crop"),
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media_translations")
													.select([
														"lucid_media_translations.title",
														"lucid_media_translations.alt",
														"lucid_media_translations.description",
														"lucid_media_translations.summary",
														"lucid_media_translations.locale_code",
													])
													.whereRef(
														"lucid_media_translations.media_id",
														"=",
														"lucid_media.id",
													),
											)
											.as("translations"),
									])
									.whereRef(
										"lucid_media.id",
										"=",
										"lucid_users.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("profile_picture"),
					])
					.where("is_deleted", "=", deletedValue)
					.where("is_locked", "=", lockedValue)
					.where(({ or, eb, exists, selectFrom }) =>
						or([
							eb("super_admin", "=", superAdminValue),
							exists(
								selectFrom("lucid_user_roles")
									.innerJoin(
										"lucid_roles",
										"lucid_roles.id",
										"lucid_user_roles.role_id",
									)
									.innerJoin(
										"lucid_role_permissions",
										"lucid_role_permissions.role_id",
										"lucid_roles.id",
									)
									.select(sql.lit(1).as("one"))
									.whereRef("lucid_user_roles.user_id", "=", "lucid_users.id")
									.where(
										"lucid_role_permissions.permission",
										"=",
										props.permission,
									),
							),
						]),
					)
					.orderBy("email", "asc")
					.execute();
			},
			{
				method: "selectMultiplePublishReviewers",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}

	async selectMultipleWithPermission<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				permission: string;
			}
		>,
	) {
		const exec = await this.executeQuery(
			() => {
				const superAdminValue = this.dbAdapter.getDefault("boolean", "true");
				const deletedValue = this.dbAdapter.getDefault("boolean", "false");
				const lockedValue = this.dbAdapter.getDefault("boolean", "false");

				return this.db
					.selectFrom("lucid_users")
					.select((eb) => [
						"id",
						"email",
						"username",
						"first_name as firstName",
						"last_name as lastName",
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select((mediaEb) => [
										"lucid_media.id",
										"lucid_media.key",
										"lucid_media.status",
										"lucid_media.storage_adapter_key",
										"lucid_media.storage_adapter_reference",
										"lucid_media.storage_adapter_data",
										"lucid_media.public",
										"lucid_media.origin",
										"lucid_media.type",
										"lucid_media.mime_type",
										"lucid_media.file_extension",
										"lucid_media.file_name",
										"lucid_media.file_size",
										"lucid_media.width",
										"lucid_media.height",
										"lucid_media.duration",
										"lucid_media.focal_x",
										"lucid_media.focal_y",
										"lucid_media.blur_hash",
										"lucid_media.average_color",
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media as profile_crop")
													.select([
														"profile_crop.id",
														"profile_crop.key",
														"profile_crop.status",
														"profile_crop.storage_adapter_key",
														"profile_crop.storage_adapter_reference",
														"profile_crop.storage_adapter_data",
														"profile_crop.public",
														"profile_crop.origin",
														"profile_crop.type",
														"profile_crop.mime_type",
														"profile_crop.file_extension",
														"profile_crop.file_name",
														"profile_crop.file_size",
														"profile_crop.width",
														"profile_crop.height",
														"profile_crop.focal_x",
														"profile_crop.focal_y",
														"profile_crop.crop_x",
														"profile_crop.crop_y",
														"profile_crop.crop_width",
														"profile_crop.crop_height",
														"profile_crop.crop_rotation",
														"profile_crop.crop_skew_x",
														"profile_crop.crop_skew_y",
														"profile_crop.blur_hash",
														"profile_crop.average_color",
														"profile_crop.base64",
														"profile_crop.is_dark",
														"profile_crop.is_light",
													])
													.where(
														"profile_crop.parent_media_id",
														"=",
														sql.ref<number>("lucid_media.id"),
													)
													.where("profile_crop.relation_type", "=", "crop")
													.where(
														"profile_crop.is_deleted",
														"=",
														this.dbAdapter.getDefault("boolean", "false"),
													),
											)
											.as("crop"),
										this.database.fn
											.jsonArrayFrom(
												mediaEb
													.selectFrom("lucid_media_translations")
													.select([
														"lucid_media_translations.title",
														"lucid_media_translations.alt",
														"lucid_media_translations.description",
														"lucid_media_translations.summary",
														"lucid_media_translations.locale_code",
													])
													.whereRef(
														"lucid_media_translations.media_id",
														"=",
														"lucid_media.id",
													),
											)
											.as("translations"),
									])
									.whereRef(
										"lucid_media.id",
										"=",
										"lucid_users.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("profile_picture"),
					])
					.where("is_deleted", "=", deletedValue)
					.where("is_locked", "=", lockedValue)
					.where(({ or, eb, exists, selectFrom }) =>
						or([
							eb("super_admin", "=", superAdminValue),
							exists(
								selectFrom("lucid_user_roles")
									.innerJoin(
										"lucid_roles",
										"lucid_roles.id",
										"lucid_user_roles.role_id",
									)
									.innerJoin(
										"lucid_role_permissions",
										"lucid_role_permissions.role_id",
										"lucid_roles.id",
									)
									.select(sql.lit(1).as("one"))
									.whereRef("lucid_user_roles.user_id", "=", "lucid_users.id")
									.where(
										"lucid_role_permissions.permission",
										"=",
										props.permission,
									),
							),
						]),
					)
					.orderBy("email", "asc")
					.execute();
			},
			{
				method: "selectMultipleWithPermission",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}
}
