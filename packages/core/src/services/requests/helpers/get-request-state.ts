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
import type { RequestRecord, RequestState } from "../types.js";

/**
 * Reads each document's collection, captured request content and current
 * destinations. Documents are read together, one collection at a time.
 */
const getRequestState: ServiceFn<
	[{ request: RequestRecord; labels?: boolean }],
	RequestState
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);
	const DocumentBricks = new DocumentBricksRepository(context.db);
	const Workflows = new DocumentWorkflowsRepository(context.db);

	const approved = data.request.approved_revision === data.request.revision;
	const states: RequestState = new Map();
	const byCollection = Map.groupBy(
		data.request.documents,
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
					deleted: null,
					label: null,
					workflowStage: null,
					versions: new Map(),
					source: null,
					request: null,
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
					deleted: null,
					label: null,
					workflowStage: null,
					versions: new Map(),
					source: null,
					request: null,
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
			//* snapshots have no stage, and stages only gate create requests while the collection requires them
			const staged =
				document.source === "latest" &&
				(data.request.type === "publish" ||
					collection.getData.publishing.review?.create === true);
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
			const request = approved ? byId(document.approved_version_id) : source;
			const stageKey = workflowsRes.data?.find(
				(workflow) => workflow.version_id === document.source_version_id,
			)?.stage_key;

			//* completed proposals are deleted, leaving the approved snapshot, and unpublish and delete requests capture nothing
			const labelVersionId =
				source?.id ??
				request?.id ??
				versions.find((version) => version.type === "latest")?.id;
			let label: string | null = null;
			if (data.labels && labelVersionId !== undefined) {
				const labelRes = await getDocumentLabel({
					context,
					bricks: DocumentBricks,
					collection,
					tables: tablesRes.data,
					documentId: document.document_id,
					versionId: labelVersionId,
				});
				if (labelRes.error) return labelRes;

				label = labelRes.data;
			}

			states.set(document.id, {
				collection,
				migrationRequired: false,
				deleted: !row
					? "permanent"
					: formatter.formatBoolean(row.is_deleted)
						? "bin"
						: null,
				label,
				workflowStage: !staged
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
				request,
			});
		}
	}

	return { error: undefined, data: states };
};

export default getRequestState;
