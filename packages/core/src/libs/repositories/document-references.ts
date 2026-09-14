import type { RefResource } from "../../exports/types.js";
import type { LucidDatabase } from "../db/client/index.js";
import { documentReferencesTable } from "../db/tables/document-references.js";
import type {
	LucidBrickTableName,
	LucidDocumentReferences,
	LucidVersionTableName,
} from "../db/tables/index.js";
import StaticRepository from "./parents/static-repository.js";

/** Stored reverse references shared by document, media and user changes. */
export default class DocumentReferencesRepository extends StaticRepository<"lucid_document_references"> {
	constructor(db: LucidDatabase) {
		super(db, documentReferencesTable);
	}

	/** Refresh existing edges without deleting references before a save succeeds. */
	async upsertMultiple(props: {
		rows: LucidDocumentReferences[];
		generation: string;
	}) {
		const batchSize = this.dbAdapter.getQueryBatchSize({
			parametersPerItem: 11,
			reservedParameters: 1,
			maxItems: 500,
		});
		for (let offset = 0; offset < props.rows.length; offset += batchSize) {
			const query = this.db
				.insertInto("lucid_document_references")
				.values(props.rows.slice(offset, offset + batchSize))
				.onConflict((oc) =>
					oc
						.columns([
							"collection_key",
							"version_id",
							"source_table",
							"source_column",
							"locale",
							"kind",
							"target_resource",
							"target_table",
							"target_id",
						])
						.doUpdateSet({ generation: props.generation }),
				);

			const result = await this.executeQuery(() => query.executeTakeFirst(), {
				method: "upsertMultiple",
			});
			if (result.response.error) return result.response;
		}

		return { error: undefined, data: undefined };
	}
	/** A replaced version no longer owns any of its previous content references. */
	async deleteByVersion(props: { collectionKey: string; versionId: number }) {
		const query = this.db
			.deleteFrom("lucid_document_references")
			.where("collection_key", "=", props.collectionKey)
			.where("version_id", "=", props.versionId);

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteByVersion",
		});
		return result.response;
	}
	/** Dynamic version tables cannot own foreign keys from the shared reference table.
	 * Call after version cascades, including failure compensation. */
	async pruneVersions(props: {
		collectionKey: string;
		versionTable: LucidVersionTableName;
		documentId?: number;
	}) {
		let query = this.db
			.deleteFrom("lucid_document_references")
			.where("collection_key", "=", props.collectionKey);

		if (props.documentId !== undefined) {
			query = query.where("document_id", "=", props.documentId);
		}

		query = query.where((eb) =>
			eb.not(
				eb.exists(
					eb
						.selectFrom(props.versionTable)
						.select("id")
						.whereRef(
							`${props.versionTable}.id`,
							"=",
							"lucid_document_references.version_id",
						),
				),
			),
		);

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "pruneVersions",
		});
		return result.response;
	}
	/** Embedded identities stay because authored JSON still contains them. */
	async deleteDirectTargets(props: {
		resource: RefResource;
		table: string;
		ids: number[];
	}) {
		const batchSize = this.dbAdapter.getQueryBatchSize({
			parametersPerItem: 1,
			reservedParameters: 3,
			maxItems: 500,
		});

		for (let offset = 0; offset < props.ids.length; offset += batchSize) {
			const query = this.db
				.deleteFrom("lucid_document_references")
				.where("target_resource", "=", props.resource)
				.where("target_table", "=", props.table)
				.where("kind", "=", "direct")
				.where("target_id", "in", props.ids.slice(offset, offset + batchSize));

			const result = await this.executeQuery(() => query.executeTakeFirst(), {
				method: "deleteDirectTargets",
			});
			if (result.response.error) return result.response;
		}

		return { error: undefined, data: undefined };
	}
	/** Remove only the native relationships cleared from a particular field table. */
	async deleteRelationTargets(props: {
		sourceTable: LucidBrickTableName;
		targetTable: string;
		documentId?: number;
	}) {
		let query = this.db
			.deleteFrom("lucid_document_references")
			.where("source_table", "=", props.sourceTable)
			.where("target_resource", "=", "documents")
			.where("target_table", "=", props.targetTable)
			.where("kind", "=", "direct");

		if (props.documentId !== undefined) {
			query = query.where("target_id", "=", props.documentId);
		}

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteRelationTargets",
		});
		return exec.response;
	}

	async deleteCollectionTarget(props: { table: string }) {
		const query = this.db
			.deleteFrom("lucid_document_references")
			.where("target_resource", "=", "documents")
			.where("target_table", "=", props.table)
			.where("kind", "=", "direct");

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteCollectionTarget",
		});
		return result.response;
	}
	async deleteByLocale(props: { locale: string }) {
		const query = this.db
			.deleteFrom("lucid_document_references")
			.where("locale", "=", props.locale);

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteByLocale",
		});
		return result.response;
	}
	/** Only discard old edges after the complete schema scan succeeds. */
	async deleteOtherGenerations(props: {
		collectionKey: string;
		generation: string;
	}) {
		const query = this.db
			.deleteFrom("lucid_document_references")
			.where("collection_key", "=", props.collectionKey)
			.where("generation", "!=", props.generation);

		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "deleteOtherGenerations",
		});
		return result.response;
	}
	async selectCollectionTargets(props: {
		table: string;
		afterId: number;
		limit: number;
	}) {
		const query = this.db
			.selectFrom("lucid_document_references")
			.select("target_id")
			.distinct()
			.where("target_resource", "=", "documents")
			.where("target_table", "=", props.table)
			.where("target_id", ">", props.afterId)
			.orderBy("target_id")
			.limit(props.limit);

		const result = await this.executeQuery(() => query.execute(), {
			method: "selectCollectionTargets",
		});
		if (result.response.error) return result.response;

		return this.validateResponse(result, {
			enabled: true,
			mode: "multiple",
			select: ["target_id"],
		});
	}
	async selectDependants(props: {
		resource: RefResource;
		table: string;
		ids: number[];
	}) {
		const query = this.db
			.selectFrom("lucid_document_references")
			.select(["collection_key", "document_id", "version_id"])
			.distinct()
			.where("target_resource", "=", props.resource)
			.where("target_table", "=", props.table)
			.where("target_id", "in", props.ids);

		const result = await this.executeQuery(() => query.execute(), {
			method: "selectDependants",
		});
		if (result.response.error) return result.response;

		return this.validateResponse(result, {
			enabled: true,
			mode: "multiple",
			select: ["collection_key", "document_id", "version_id"],
		});
	}
}
