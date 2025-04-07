import z from "zod";
import DynamicRepository from "./parents/dynamic-repository.js";
import { versionTypesSchema } from "../../schemas/document-versions.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../db/types.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { QueryProps } from "./types.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { BrickQueryResponse } from "./document-bricks.js";

export default class DocumentVersionsRepository extends DynamicRepository<LucidVersionTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key__versions");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		type: versionTypesSchema,
		created_by: z.number(),
		updated_by: z.number(),
		updated_at: z.string().nullable(),
		created_at: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		type: this.dbAdapter.getDataType("text"),
		created_by: this.dbAdapter.getDataType("integer"),
		updated_by: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Takes a group of document IDs and their tables, document-field table schema and fetches all document-field rows for that version
	 */
	async selectMultipleUnion<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				unions: Array<{
					collectionKey: string;
					tables: {
						document: LucidDocumentTableName;
						version: LucidVersionTableName;
						documentFields: LucidBrickTableName;
					};
					documentFieldSchema: CollectionSchemaTable<LucidBrickTableName>;
					ids: number[];
				}>;
				/** The status used to determine which version of the document custom field relations to fetch */
				versionType: Exclude<DocumentVersionType, "revision">;
			}
		>,
	) {
		if (props.unions.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const unionQueries = props.unions.map(
			({ tables, ids, documentFieldSchema }) => {
				return (
					this.db
						.selectFrom(tables.version)
						.innerJoin(tables.document, (join) =>
							join.onRef(
								`${tables.document}.id`,
								"=",
								// @ts-expect-error
								`${tables.version}.document_id`,
							),
						)
						// @ts-expect-error
						.select([
							`${tables.version}.id`,
							`${tables.version}.collection_key`,
							`${tables.version}.document_id`,
							`${tables.version}.type`,
							`${tables.version}.created_by`,
							`${tables.version}.updated_by`,
							`${tables.version}.created_at`,
							`${tables.version}.updated_at`,
						])
						.select((eb) => [
							this.dbAdapter
								.jsonArrayFrom(
									this.db
										.selectFrom(tables.documentFields)
										.whereRef(
											`${tables.documentFields}.document_id`,
											"=",
											`${tables.version}.document_id`,
										)
										.whereRef(
											`${tables.documentFields}.document_version_id`,
											"=",
											`${tables.version}.id`,
										)
										.select(
											documentFieldSchema.columns.map(
												(column) => `${tables.documentFields}.${column.name}`,
											),
										),
								)
								.as(tables.documentFields),
						])
						// @ts-expect-error
						.where(`${tables.version}.type`, "=", props.versionType)
						// @ts-expect-error
						.where(`${tables.version}.document_id`, "in", ids)
						.where(
							`${tables.document}.is_deleted`,
							"=",
							this.dbAdapter.getDefault("boolean", "false"),
						)
				);
			},
		);

		let query = unionQueries[0];

		if (query === undefined) {
			return {
				error: undefined,
				data: [],
			};
		}

		for (let i = 1; i < unionQueries.length; i++) {
			const iQuery = unionQueries[i];
			if (iQuery === undefined) continue;
			query = query.unionAll(iQuery);
		}

		const exec = await this.executeQuery(
			() => query.execute() as unknown as Promise<BrickQueryResponse[]>,
			{
				method: "selectMultipleByIdsUnion",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}
}
