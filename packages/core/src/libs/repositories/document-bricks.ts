import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidBricksTable,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../db/types.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { DynamicConfig, QueryProps } from "./types.js";
import type { CollectionSchemaColumn } from "../../services/collection-migrator/schema/types.js";

export default class DocumentBricksRepository extends DynamicRepository<LucidBrickTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key__fields");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		document_version_id: z.number(),
		locale: z.string(),
		position: z.number().optional(),
		is_open: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		// repeater specific
		parent_id: z.string().optional(),
		parent_id_ref: z.string().optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		document_version_id: this.dbAdapter.getDataType("integer"),
		locale: this.dbAdapter.getDataType("text"),
		position: this.dbAdapter.getDataType("integer"),
		is_open: this.dbAdapter.getDataType("boolean"),
		// repeater specific
		parent_id: this.dbAdapter.getDataType("integer"),
		parent_id_ref: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries

	/**
	 * @todo remove lucid_media join, that only works if one CF in the table has that relation.
	 * @todo create a seperate query to run after this, this will include all document, user, media relation queries.
	 */
	async selectMultipleByVersionId(
		props: {
			/** The version type to use for any custom field document references  */
			versionType: Exclude<DocumentVersionType, "revision">;
			versionId: number;
			bricks: Array<{
				table: LucidBrickTableName;
				columns: Array<CollectionSchemaColumn>;
			}>;
		},
		dynamicConfig: DynamicConfig<LucidVersionTableName>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			.where("id", "=", props.versionId)
			.selectAll();

		for (const brick of props.bricks) {
			let brickQuery = this.db
				.selectFrom(brick.table)
				.where("document_version_id", "=", props.versionId);

			for (const column of brick.columns) {
				if (column.source === "core" || !column.foreignKey) continue;

				switch (column.foreignKey.table) {
					case "lucid_media": {
						// @ts-expect-error
						brickQuery = brickQuery
							.leftJoin(
								"lucid_media",
								// @ts-expect-error
								`${brick.table}.${column.name}`,
								"lucid_media.id",
							)
							.select([
								"lucid_media.key as media_key",
								"lucid_media.mime_type as media_mime_type",
								"lucid_media.file_extension as media_file_extension",
								"lucid_media.file_size as media_file_size",
								"lucid_media.width as media_width",
								"lucid_media.height as media_height",
								"lucid_media.type as media_type",
								"lucid_media.blur_hash as media_blur_hash",
								"lucid_media.average_colour as media_average_colour",
								"lucid_media.is_dark as media_is_dark",
								"lucid_media.is_light as media_is_light",
							]);
						break;
					}
				}
			}

			brickQuery = brickQuery.select(
				brick.columns.map(
					(c) => `${brick.table}.${c.name}` as keyof LucidBricksTable,
				),
			);

			query = query.select((eb) =>
				this.dbAdapter.jsonArrayFrom(brickQuery).as(brick.table),
			);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectMultipleByVersionId",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
		});
	}
}
