import constants from "../../../constants/constants.js";
import collections from "../../../libs/collection/collections.js";
import getMigrationStatus from "../../../libs/collection/get-collection-migration-status.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../../libs/formatters/index.js";
import {
	DocumentBricksRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
	DocumentWorkflowsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { resolveEffectiveWorkflowStage } from "../../document-workflows/helpers/index.js";
import getDocumentLabel from "../../documents/helpers/get-document-label.js";
import type { ReleaseRecord, ReleaseState } from "../types.js";

/**
 * Reads each document's collection, captured release content and current
 * destinations. Documents are read together, one collection at a time.
 */
const getReleaseState: ServiceFn<
	[{ release: ReleaseRecord; labels?: boolean }],
	ReleaseState
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);
	const DocumentBricks = new DocumentBricksRepository(context.db);
	const Workflows = new DocumentWorkflowsRepository(context.db);

	const approved = data.release.approved_revision === data.release.revision;
	const states: ReleaseState = new Map();
	const byCollection = Map.groupBy(
		data.release.documents,
		(document) => document.collection_key,
	);

	for (const [collectionKey, documents] of byCollection) {
		const collectionRes = await collections.getSingle(context, {
			key: collectionKey,
		});
		if (collectionRes.error) {
			for (const document of documents) {
				states.set(document.id, {
					collection: null,
					migrationRequired: false,
					deleted: false,
					label: null,
					workflowStage: null,
					versions: new Map(),
					source: null,
					release: null,
				});
			}
			continue;
		}

		const collection = collectionRes.data;
		const [migrationRes, tablesRes] = await Promise.all([
			getMigrationStatus(context, { collection }),
			getTableNames(context, collectionKey),
		]);
		if (migrationRes.error) return migrationRes;
		if (tablesRes.error) return tablesRes;

		if (migrationRes.data.requiresMigration) {
			for (const document of documents) {
				states.set(document.id, {
					collection,
					migrationRequired: true,
					deleted: false,
					label: null,
					workflowStage: null,
					versions: new Map(),
					source: null,
					release: null,
				});
			}
			continue;
		}

		const documentIds = documents.map((document) => document.document_id);
		const proposalIds = documents.flatMap((document) =>
			document.source === "latest" && document.source_version_id !== null
				? [document.source_version_id]
				: [],
		);
		const [documentsRes, versionsRes, workflowsRes] = await Promise.all([
			Documents.selectMultiple(
				{
					select: ["id", "is_deleted"],
					where: [{ key: "id", operator: "in", value: documentIds }],
				},
				{ tableName: tablesRes.data.document },
			),
			Versions.selectMultiple(
				{
					select: ["id", "document_id", "type", "content_id"],
					where: [
						{ key: "document_id", operator: "in", value: documentIds },
						{ key: "type", operator: "!=", value: "revision" },
					],
				},
				{ tableName: tablesRes.data.version },
			),
			proposalIds.length > 0
				? Workflows.selectMultiple({
						select: ["version_id", "stage_key"],
						where: [
							{ key: "collection_key", operator: "=", value: collectionKey },
							{ key: "version_id", operator: "in", value: proposalIds },
						],
					})
				: { error: undefined, data: [] },
		]);
		if (documentsRes.error) return documentsRes;
		if (versionsRes.error) return versionsRes;
		if (workflowsRes.error) return workflowsRes;

		for (const document of documents) {
			const versions = (versionsRes.data ?? []).filter(
				(version) => version.document_id === document.document_id,
			);
			const byId = (id: number | null) => {
				const version = versions.find((version) => version.id === id);
				return version
					? { id: version.id, contentId: version.content_id }
					: null;
			};
			const row = documentsRes.data?.find(
				(row) => row.id === document.document_id,
			);
			const source = byId(document.source_version_id);
			const release = approved ? byId(document.approved_version_id) : source;
			const stageKey = workflowsRes.data?.find(
				(workflow) => workflow.version_id === document.source_version_id,
			)?.stage_key;

			//* released proposals are deleted, leaving the approved snapshot
			const labelVersion = source ?? release;
			let label: string | null = null;
			if (data.labels && labelVersion) {
				const labelRes = await getDocumentLabel({
					context,
					bricks: DocumentBricks,
					collection,
					tables: tablesRes.data,
					documentId: document.document_id,
					versionId: labelVersion.id,
				});
				if (labelRes.error) return labelRes;

				label = labelRes.data;
			}

			states.set(document.id, {
				collection,
				migrationRequired: false,
				deleted: !row || formatter.formatBoolean(row.is_deleted),
				label,
				workflowStage:
					document.source !== "latest"
						? null
						: approved
							? document.approved_workflow_stage
							: (resolveEffectiveWorkflowStage({ collection, stageKey })?.key ??
								null),
				versions: new Map(
					versions
						.filter(
							(version) =>
								version.type !==
									constants.collectionBuilder.publishing.proposalVersionType &&
								version.type !==
									constants.collectionBuilder.publishing.snapshotVersionType,
						)
						.map((version) => [
							version.type,
							{ id: version.id, contentId: version.content_id },
						]),
				),
				source,
				release,
			});
		}
	}

	return { error: undefined, data: states };
};

export default getReleaseState;
