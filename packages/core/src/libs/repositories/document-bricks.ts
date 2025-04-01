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

	async selectMultipleByVersionId(
		props: {
			/** The version type to use for any custom field document references  */
			versionType: Exclude<DocumentVersionType, "revision">;
			versionId: number;
			bricks: Array<{
				table: LucidBrickTableName;
				columns: Array<keyof LucidBricksTable>;
			}>;
		},
		dynamicConfig: DynamicConfig<LucidVersionTableName>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			.where("id", "=", props.versionId)
			.selectAll();

		for (const brick of props.bricks) {
			query = query.select((eb) =>
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom(brick.table)
							.where("document_version_id", "=", props.versionId)
							.select(brick.columns),
					)
					.as(brick.table),
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
