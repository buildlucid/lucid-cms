import type { CollectionSchemaColumn } from "../collection/schema/types.js";
import type { LucidDatabase } from "../db/client/index.js";
import { documentBricksTable } from "../db/tables/document-bricks.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
	LucidVersionTable,
	LucidVersionTableName,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { DynamicConfig } from "./types.js";

export interface BrickQueryResponse extends Select<LucidVersionTable> {
	[key: LucidBrickTableName]: Select<LucidBricksTable>[];
}

export default class DocumentBricksRepository extends DynamicRepository<LucidBrickTableName> {
	constructor(db: LucidDatabase) {
		super(db, documentBricksTable);
	}

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
		const { table, ref } = this.db.dynamic;

		let query = this.db
			.selectFrom(table(dynamicConfig.tableName).as("v"))
			.where(ref("v.id"), "=", props.versionId)
			.selectAll("v");

		if (props.documentId) {
			query = query.where(ref("v.document_id"), "=", props.documentId);
		}

		for (const brick of props.bricksSchema) {
			query = query.select(() =>
				this.database.fn
					.jsonArrayFrom(
						this.db
							.selectFrom(table(brick.name).as("b"))
							.where(ref("b.document_version_id"), "=", props.versionId)
							.select(brick.columns.map((c) => ref(`b.${c.name}`))),
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

		const { table, ref } = this.db.dynamic;

		let query = this.db.updateTable(table(dynamicConfig.tableName).as("t"));

		const updateObj: Record<string, null> = {};
		for (const col of props.columns) {
			updateObj[col] = null;
		}
		query = query.set(updateObj);

		query = query.where((eb) => {
			const conditions = [];

			for (const column of props.columns) {
				conditions.push(eb(ref(`t.${String(column)}`), "=", props.documentId));
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
