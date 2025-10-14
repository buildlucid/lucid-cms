import z from "zod/v4";
import DynamicRepository from "./parents/dynamic-repository.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidBricksTable,
	LucidVersionTable,
	LucidVersionTableName,
	Select,
} from "../db-adapter/types.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { DynamicConfig } from "./types.js";
import type { CollectionSchemaColumn } from "../collection/schema/types.js";

export interface BrickQueryResponse extends Select<LucidVersionTable> {
	[key: LucidBrickTableName]: Select<LucidBricksTable>[];
}

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
		// brick specific
		brick_type: z.union([z.literal("fixed"), z.literal("builder")]).optional(),
		brick_instance_id: z.string().optional(),
		// brick and document-field specific
		brick_id_ref: z.number().optional(),
		// repeater specific
		brick_id: z.number().optional(),
		parent_id: z.number().optional(),
		parent_id_ref: z.number().optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		document_version_id: this.dbAdapter.getDataType("integer"),
		locale: this.dbAdapter.getDataType("text"),
		position: this.dbAdapter.getDataType("integer"),
		is_open: this.dbAdapter.getDataType("boolean"),
		// brick specific
		brick_type: this.dbAdapter.getDataType("text"),
		brick_instance_id: this.dbAdapter.getDataType("text"),
		// brick and document-field specific
		brick_id_ref: this.dbAdapter.getDataType("integer"),
		// repeater specific
		brick_id: this.dbAdapter.getDataType("integer"),
		parent_id: this.dbAdapter.getDataType("integer"),
		parent_id_ref: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;

	/**
	 * Fetches all brick rows for a given document version ID
	 */
	async selectMultipleByVersionId(
		props: {
			versionId: number;
			documentId?: number;
			bricksSchema: Array<{
				name: LucidBrickTableName;
				columns: Array<CollectionSchemaColumn>;
			}>;
		},
		dynamicConfig: DynamicConfig<LucidVersionTableName>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			.where("id", "=", props.versionId)
			.selectAll();

		if (props.documentId) {
			query = query.where(
				`${dynamicConfig.tableName}.document_id`,
				"=",
				props.documentId,
			);
		}

		for (const brick of props.bricksSchema) {
			query = query.select(() =>
				this.dbAdapter
					.jsonArrayFrom(
						this.db
							.selectFrom(brick.name)
							.where("document_version_id", "=", props.versionId)
							.select(brick.columns.map((c) => `${brick.name}.${c.name}`)),
					)
					.as(brick.name),
			);
		}

		const exec = await this.executeQuery(
			() => query.executeTakeFirst() as unknown as Promise<BrickQueryResponse>,
			{
				method: "selectMultipleByVersionId",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
		});
	}

	/**
	 * Nullifies references to a deleted document in a single brick table
	 */
	async nullifyDocumentReferences(
		props: {
			columns: Array<keyof LucidBricksTable>;
			documentId: number;
		},
		dynamicConfig: DynamicConfig<LucidBrickTableName>,
	) {
		if (props.columns.length === 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		let query = this.db.updateTable(dynamicConfig.tableName);

		const updateObj: Record<string, null> = {};
		for (const col of props.columns) {
			updateObj[col] = null;
		}
		query = query.set(updateObj);

		query = query.where((eb) => {
			const conditions = [];

			for (const column of props.columns) {
				conditions.push(eb(column as string, "=", props.documentId));
			}
			return eb.or(conditions);
		});

		const exec = await this.executeQuery(() => query.execute(), {
			method: "nullifyDocumentReferences",
			tableName: dynamicConfig.tableName,
		});

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
		});
	}
}
