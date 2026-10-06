import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentsRepository,
	DocumentWorkflowsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestDocumentRecord } from "../types.js";

/**
 * Marks a requested document as created once its create request has landed it
 * in latest. The proposal's workflow becomes latest's, keeping the approved
 * stage and assignees, as the proposal is removed once completed.
 */
const completeCreation: ServiceFn<
	[{ document: RequestDocumentRecord; userId: number }],
	undefined
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db);
	const Workflows = new DocumentWorkflowsRepository(context.db);

	const tablesRes = await getTableNames(context, data.document.collection_key);
	if (tablesRes.error) return tablesRes;

	const documentRes = await Documents.updateSingle(
		{
			data: {
				create_request_id: null,
				updated_by: data.userId,
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "id", operator: "=", value: data.document.document_id }],
		},
		{ tableName: tablesRes.data.document },
	);
	if (documentRes.error) return documentRes;

	if (data.document.source_version_id === null) {
		return { error: undefined, data: undefined };
	}

	const workflowRes = await Workflows.updateSingle({
		data: { version_id: null },
		where: [
			{
				key: "collection_key",
				operator: "=",
				value: data.document.collection_key,
			},
			{
				key: "version_id",
				operator: "=",
				value: data.document.source_version_id,
			},
		],
	});
	if (workflowRes.error) return workflowRes;

	return { error: undefined, data: undefined };
};

export default completeCreation;
