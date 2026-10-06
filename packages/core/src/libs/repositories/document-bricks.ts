import z from "zod";
import constants from "../../constants/constants.js";
import prefixGeneratedColName from "../collection/helpers/prefix-generated-column-name.js";
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
	/** Read stored field values in bounded pages during reference schema refreshes. */
	async selectReferenceValues(
		props: { afterId: number; limit: number },
		dynamicConfig: DynamicConfig<LucidBrickTableName>,
	) {
		const schema = z.looseObject({
			id: z.number(),
			document_id: z.number(),
			document_version_id: z.number(),
			collection_key: z.string(),
			locale: z.string().nullable(),
			position: z.number(),
		});
		const query = this.db
			.selectFrom(dynamicConfig.tableName)
			.selectAll()
			.where("id", ">", props.afterId)
			.orderBy("id")
			.limit(props.limit);

		const exec = await this.executeQuery(
			() => query.execute() as Promise<z.infer<typeof schema>[]>,
			{
				method: "selectReferenceValues",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "multiple",
			selectAll: true,
			schema,
		});
	}
	/**
	 * Finds the live versions (latest and environments) whose relation fields
	 * point at a collection's documents. Revisions and request snapshots keep
	 * their authored references.
	 */
	async selectRelationReferenceVersions(
		props: {
			collectionKey: string;
			documentIds?: number[];
			versionTable: LucidVersionTableName;
		},
		dynamicConfig: DynamicConfig<LucidBrickTableName>,
	) {
		let query = this.db
			.selectFrom(dynamicConfig.tableName)
			.innerJoin(
				props.versionTable,
				`${props.versionTable}.id`,
				`${dynamicConfig.tableName}.document_version_id`,
			)
			.select([
				`${dynamicConfig.tableName}.document_id`,
				`${dynamicConfig.tableName}.document_version_id`,
				`${props.versionTable}.type`,
			])
			.where(
				`${dynamicConfig.tableName}.${prefixGeneratedColName("collection_key")}`,
				"=",
				props.collectionKey,
			)
			.where(`${props.versionTable}.type`, "not in", [
				"revision",
				constants.collectionBuilder.publishing.snapshotVersionType,
				constants.collectionBuilder.publishing.proposalVersionType,
			]);

		if (props.documentIds !== undefined) {
			query = query.where(
				`${dynamicConfig.tableName}.${prefixGeneratedColName("document_id")}`,
				"in",
				props.documentIds,
			);
		}

		const exec = await this.executeQuery(
			() =>
				query.execute() as Promise<
					Array<{
						document_id: number;
						document_version_id: number;
						type: string;
					}>
				>,
			{
				method: "selectRelationReferenceVersions",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, { mode: "multiple" });
	}
	/** Remove relation rows and return the documents whose content changed. */
	async deleteRelationReferences(
		props: {
			collectionKey: string;
			documentIds?: number[];
			versionIds: number[];
		},
		dynamicConfig: DynamicConfig<LucidBrickTableName>,
	) {
		let query = this.db
			.deleteFrom(dynamicConfig.tableName)
			.where("document_version_id", "in", props.versionIds)
			.where(
				prefixGeneratedColName("collection_key"),
				"=",
				props.collectionKey,
			);
		if (props.documentIds !== undefined) {
			query = query.where(
				prefixGeneratedColName("document_id"),
				"in",
				props.documentIds,
			);
		}
		const result = await this.executeQuery(
			() => query.returning(["document_id", "document_version_id"]).execute(),
			{
				method: "deleteRelationReferences",
				tableName: dynamicConfig.tableName,
			},
		);
		if (result.response.error) return result.response;
		return this.validateResponse(result, {
			enabled: true,
			mode: "multiple",
			select: ["document_id", "document_version_id"],
		});
	}
}
