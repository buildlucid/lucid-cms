import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { mediaFoldersTable } from "../db/tables/media-folders.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaFoldersRepository extends StaticRepository<"lucid_media_folders"> {
	constructor(db: LucidDatabase) {
		super(db, mediaFoldersTable);
	}

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
			.selectFrom("lucid_media_folders")
			.select(["id"])
			.where("id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: ["id"],
		});
	}

	async selectMultipleForHierarchy<V extends boolean = false>(
		props: QueryProps<V, object>,
	) {
		const query = this.db
			.selectFrom("lucid_media_folders")
			.select([
				"id",
				"title",
				"parent_folder_id",
				"created_by",
				"updated_by",
				"created_at",
				"updated_at",
			]);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleForHierarchy",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: [
				"id",
				"title",
				"parent_folder_id",
				"created_by",
				"updated_by",
				"created_at",
				"updated_at",
			],
		});
	}

	async selectMultipleWithCounts<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				queryParams: Record<string, unknown>;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				const mainQuery = this.db
					.selectFrom("lucid_media_folders")
					.select((eb) => [
						"lucid_media_folders.id",
						"lucid_media_folders.title",
						"lucid_media_folders.parent_folder_id",
						"lucid_media_folders.created_by",
						"lucid_media_folders.updated_by",
						"lucid_media_folders.created_at",
						"lucid_media_folders.updated_at",
						eb
							.selectFrom("lucid_media_folders as children")
							.select(({ fn }) =>
								fn.count<number>("children.id").as("folder_count"),
							)
							.whereRef(
								"children.parent_folder_id",
								"=",
								"lucid_media_folders.id",
							)
							.as("folder_count"),
						eb
							.selectFrom("lucid_media")
							.select(({ fn }) =>
								fn.count<number>("lucid_media.id").as("media_count"),
							)
							.whereRef("lucid_media.folder_id", "=", "lucid_media_folders.id")
							.where(
								"lucid_media.is_hidden",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							)
							.as("media_count"),
					]);

				const countQuery = this.db
					.selectFrom("lucid_media_folders")
					.select(({ fn }) =>
						fn.count<number>("lucid_media_folders.id").as("count"),
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
			{ method: "selectMultipleWithCounts" },
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"title",
				"parent_folder_id",
				"created_by",
				"updated_by",
				"created_at",
				"updated_at",
				"folder_count",
				"media_count",
			],
		});
	}
	/** Returns descendant folder IDs. */
	async getDescendantIds(props: { folderIds: number[] }) {
		const query = this.db
			.withRecursive("desc_folders", (db) =>
				db
					.selectFrom("lucid_media_folders")
					.select(["id", "parent_folder_id"])
					.where("id", "in", props.folderIds)
					.unionAll(
						db
							.selectFrom("lucid_media_folders")
							.innerJoin(
								"desc_folders",
								"desc_folders.id",
								"lucid_media_folders.parent_folder_id",
							)
							.select([
								"lucid_media_folders.id",
								"lucid_media_folders.parent_folder_id",
							]),
					),
			)
			.selectFrom("desc_folders")
			.select(["id"])
			.groupBy(["id"]);

		const exec = await this.executeQuery(
			() => query.execute() as Promise<{ id: number }[]>,
			{ method: "getDescendantIds" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple",
			select: ["id"],
		});
	}
	async checkCircularParents(props: {
		folderId: number;
		parentFolderId: number;
	}) {
		const query = this.db
			.withRecursive("ancestors", (db) =>
				db
					.selectFrom("lucid_media_folders")
					.select(["id as current_id", "parent_folder_id as parent_id"])
					.where("id", "=", props.parentFolderId)
					.unionAll(
						db
							.selectFrom("lucid_media_folders")
							.innerJoin(
								"ancestors",
								"ancestors.parent_id",
								"lucid_media_folders.id",
							)
							.select([
								"lucid_media_folders.id as current_id",
								"lucid_media_folders.parent_folder_id as parent_id",
							]),
					),
			)
			.selectFrom("ancestors")
			.select("parent_id")
			.where("parent_id", "=", props.folderId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "checkCircularParents",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
			select: ["parent_id"],
		});
	}
	async getBreadcrumb(props: { folderId: number }) {
		const query = this.db
			.withRecursive("breadcrumb", (db) =>
				db
					.selectFrom("lucid_media_folders")
					.select(["id", "title", "parent_folder_id"])
					.where("id", "=", props.folderId)
					.unionAll(
						db
							.selectFrom("lucid_media_folders")
							.innerJoin(
								"breadcrumb",
								"breadcrumb.parent_folder_id",
								"lucid_media_folders.id",
							)
							.select([
								"lucid_media_folders.id",
								"lucid_media_folders.title",
								"lucid_media_folders.parent_folder_id",
							]),
					),
			)
			.selectFrom("breadcrumb")
			.select(["id", "title", "parent_folder_id"])
			.orderBy("parent_folder_id", "asc");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "getBreadcrumb",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple",
			select: ["id", "title", "parent_folder_id"],
		});
	}
}
