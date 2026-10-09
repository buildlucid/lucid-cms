import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestDocumentRecord } from "../types.js";
import landProposalWorkflow from "./land-proposal-workflow.js";

/**
 * Marks a requested document as created once its create request has landed it
 * in latest. The proposal's workflow becomes latest's, keeping the approved
 * stage and assignees, as the proposal is removed once completed.
 */
const completeCreation: ServiceFn<
	[
		{
			document: RequestDocumentRecord;
			userId: number | null;
			agentRunId?: string;
		},
	],
	undefined
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db);

	const tablesRes = await getTableNames(context, data.document.collection_key);
	if (tablesRes.error) return tablesRes;

	const documentRes = await Documents.updateSingle(
		{
			data: {
				create_request_id: null,
				updated_by: data.userId,
				updated_by_run_id: data.agentRunId ?? null,
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "id", operator: "=", value: data.document.document_id }],
		},
		{ tableName: tablesRes.data.document },
	);
	if (documentRes.error) return documentRes;

	return landProposalWorkflow(context, { document: data.document });
};

export default completeCreation;
