import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
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

	/**
	 * @todo make brickTable an array of objects containing column names
	 */
	async selectMultipleByVersionId<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				/** The version type to use for any custom field document references  */
				versionType: Exclude<DocumentVersionType, "revision">;
				versionId: number;
				brickTables: LucidBrickTableName[];
			}
		>,
		dynamicConfig: DynamicConfig<LucidVersionTableName>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			.where("id", "=", props.versionId)
			.selectAll();

		for (const brickTable of props.brickTables) {
			query = query.select((eb) =>
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom(brickTable)
							.where("document_version_id", "=", props.versionId)
							.select([
								"id",
								"collection_key",
								"document_id",
								"document_version_id",
								"locale",
								"position",
								"is_open",
								// "parent_id",
								// "parent_id_ref",
							]),
					)
					.as(brickTable),
			);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectMultipleByVersionId",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}
