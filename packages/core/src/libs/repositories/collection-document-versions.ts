import type z from "zod";
import type collectionDocumentsSchema from "../../schemas/collection-documents.js";
import type { Config } from "../../types.js";
import { sql } from "kysely";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type {
	KyselyDB,
	DocumentVersionType,
	LucidCollectionDocumentVersions,
	Select,
} from "../db/types.js";

export default class CollectionDocumentVersionsRepo {
	constructor(private db: KyselyDB) {}

	// ----------------------------------------
	// select
	selectSingle = async <
		K extends keyof Select<LucidCollectionDocumentVersions>,
	>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_collection_document_versions">;
	}) => {
		let query = this.db
			.selectFrom("lucid_collection_document_versions")
			.select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidCollectionDocumentVersions>, K> | undefined
		>;
	};
	selectMultipleRevisions = async (props: {
		collectionKey: string;
		documentId: number;
		query: z.infer<typeof collectionDocumentsSchema.getMultipleRevisions.query>;
		config: Config;
	}) => {
		const query = this.db
			.selectFrom("lucid_collection_document_versions")
			.select((eb) => [
				// Version
				"lucid_collection_document_versions.id",
				"lucid_collection_document_versions.version_type",
				"lucid_collection_document_versions.promoted_from",
				"lucid_collection_document_versions.created_at",
				"lucid_collection_document_versions.created_by",
				// Bricks
				props.config.db
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_collection_document_bricks")
							.select((eb) => [
								"lucid_collection_document_bricks.id",
								"lucid_collection_document_bricks.brick_type",
								"lucid_collection_document_bricks.brick_key",
								// Fields
								eb
									.selectFrom("lucid_collection_document_fields")
									.select(
										sql`count(distinct lucid_collection_document_fields.fields_id)`.as(
											"field_count",
										),
									)
									.whereRef(
										"lucid_collection_document_fields.collection_brick_id",
										"=",
										"lucid_collection_document_bricks.id",
									)
									.as("field_count"),
							])
							.whereRef(
								"lucid_collection_document_bricks.collection_document_version_id",
								"=",
								"lucid_collection_document_versions.id",
							),
					)
					.as("bricks"),
			])
			.leftJoin("lucid_collection_documents", (join) =>
				join.onRef(
					"lucid_collection_documents.id",
					"=",
					"lucid_collection_document_versions.document_id",
				),
			)
			.select([
				"lucid_collection_documents.id as document_id",
				"lucid_collection_documents.collection_key",
				"lucid_collection_documents.created_by as document_created_by",
				"lucid_collection_documents.created_at as document_created_at",
				"lucid_collection_documents.updated_by as document_updated_by",
				"lucid_collection_documents.updated_at as document_updated_at",
			])
			.where("lucid_collection_documents.is_deleted", "=", 0)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collectionKey,
			)
			.where(
				"lucid_collection_document_versions.document_id",
				"=",
				props.documentId,
			)
			.where("lucid_collection_document_versions.version_type", "=", "revision")
			.groupBy([
				"lucid_collection_document_versions.id",
				"lucid_collection_document_versions.version_type",
				"lucid_collection_document_versions.promoted_from",
				"lucid_collection_document_versions.created_at",
				"lucid_collection_document_versions.created_by",
			]);

		const countQuery = this.db
			.selectFrom("lucid_collection_document_versions")
			.select(
				sql`count(distinct lucid_collection_document_versions.id)`.as("count"),
			)
			.leftJoin("lucid_collection_documents", (join) =>
				join.onRef(
					"lucid_collection_documents.id",
					"=",
					"lucid_collection_document_versions.document_id",
				),
			)
			.where("lucid_collection_documents.is_deleted", "=", 0)
			.where(
				"lucid_collection_documents.collection_key",
				"=",
				props.collectionKey,
			)
			.where(
				"lucid_collection_document_versions.document_id",
				"=",
				props.documentId,
			)
			.where(
				"lucid_collection_document_versions.version_type",
				"=",
				"revision",
			);

		const { main, count } = queryBuilder.main(
			{
				main: query,
				count: countQuery,
			},
			{
				queryParams: {
					filter: props.query.filter,
					sort: props.query.sort,
					page: props.query.page,
					perPage: props.query.perPage,
				},
				meta: {
					tableKeys: {
						filters: {
							createdBy: "lucid_collection_document_versions.created_by",
						},
						sorts: {
							createdAt: "lucid_collection_document_versions.created_at",
						},
					},
				},
			},
		);

		return await Promise.all([
			main.execute(),
			count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
		]);
	};
	// ----------------------------------------
	// create
	createSingle = async (props: {
		document_id: number;
		version_type: DocumentVersionType;
		promoted_from?: number;
		created_by: number;
	}) => {
		return this.db
			.insertInto("lucid_collection_document_versions")
			.values({
				document_id: props.document_id,
				version_type: props.version_type,
				promoted_from: props.promoted_from,
				created_by: props.created_by,
			})
			.returningAll()
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_versions">;
		data: {
			version_type?: DocumentVersionType;
			promoted_from?: number;
			created_by?: number;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_collection_document_versions")
			.set({
				version_type: props.data.version_type,
				promoted_from: props.data.promoted_from,
				created_by: props.data.created_by,
			})
			.returning("id");

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_collection_document_versions">;
	}) => {
		let query = this.db
			.deleteFrom("lucid_collection_document_versions")
			.returning(["id"]);

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
}
