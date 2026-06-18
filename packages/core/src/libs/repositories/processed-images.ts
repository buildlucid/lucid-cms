import { sql } from "kysely";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class ProcessedImagesRepository extends StaticRepository<"lucid_processed_images"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_processed_images");
	}
	tableSchema = z.object({
		key: z.string(),
		media_key: z.string(),
		file_size: z.number(),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		media_key: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async sumFileSize() {
		const query = this.db
			.selectFrom("lucid_processed_images")
			.select(sql<string | number>`COALESCE(SUM(file_size), 0)`.as("total"));

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					{ total: string | number | null } | undefined
				>,
			{
				method: "sumFileSize",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.total ?? 0),
		};
	}

	async sumFileSizeByMediaTenant(props: { tenantKey: string | null }) {
		let query = this.db
			.selectFrom("lucid_processed_images")
			.leftJoin(
				"lucid_media",
				"lucid_media.key",
				"lucid_processed_images.media_key",
			)
			.select(
				sql<
					string | number
				>`COALESCE(SUM(lucid_processed_images.file_size), 0)`.as("total"),
			);

		query =
			props.tenantKey === null
				? query.where("lucid_media.tenant_key", "is", null)
				: query.where("lucid_media.tenant_key", "=", props.tenantKey);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					{ total: string | number | null } | undefined
				>,
			{
				method: "sumFileSizeByMediaTenant",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.total ?? 0),
		};
	}

	async sumFileSizeGroupedByMediaTenant() {
		const query = this.db
			.selectFrom("lucid_processed_images")
			.leftJoin(
				"lucid_media",
				"lucid_media.key",
				"lucid_processed_images.media_key",
			)
			.select([
				"lucid_media.tenant_key as tenant_key",
				sql<
					string | number
				>`COALESCE(SUM(lucid_processed_images.file_size), 0)`.as("total"),
			])
			.groupBy("lucid_media.tenant_key");

		const exec = await this.executeQuery(
			() =>
				query.execute() as Promise<
					{ tenant_key: string | null; total: string | number | null }[]
				>,
			{
				method: "sumFileSizeGroupedByMediaTenant",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: exec.response.data.map((row) => ({
				tenant_key: row.tenant_key,
				total: Number(row.total ?? 0),
			})),
		};
	}

	async selectMultipleByMediaTenant(props: { tenantKey: string }) {
		const query = this.db
			.selectFrom("lucid_processed_images")
			.innerJoin(
				"lucid_media",
				"lucid_media.key",
				"lucid_processed_images.media_key",
			)
			.select([
				"lucid_processed_images.key",
				"lucid_processed_images.file_size",
			])
			.$call((qb) =>
				queryBuilder.tenantScope(qb, {
					tenantKey: props.tenantKey,
					column: "lucid_media.tenant_key",
				}),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleByMediaTenant",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple",
			select: ["key", "file_size"],
		});
	}

	async selectMultipleWithMediaTenant(props?: { tenantKey?: string | null }) {
		const query = this.db
			.selectFrom("lucid_processed_images")
			.leftJoin(
				"lucid_media",
				"lucid_media.key",
				"lucid_processed_images.media_key",
			)
			.select([
				"lucid_processed_images.key",
				"lucid_processed_images.media_key",
				"lucid_processed_images.file_size",
				"lucid_media.tenant_key as tenant_key",
			])
			.$call((qb) =>
				props?.tenantKey
					? queryBuilder.tenantScope(qb, {
							tenantKey: props.tenantKey,
							column: "lucid_media.tenant_key",
						})
					: qb,
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectMultipleWithMediaTenant",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: exec.response.data,
		};
	}
}
