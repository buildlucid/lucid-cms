import collections from "../../libs/collection/collections.js";
import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getWorkflowConfig } from "./helpers/index.js";

/** Starts a request proposal's workflow at the collection's initial stage. The caller holds the document claim. */
const createProposal: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Workflows = new DocumentWorkflowsRepository(context.db);

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const workflow = getWorkflowConfig(collectionRes.data);
	if (!workflow) return { error: undefined, data: undefined };

	const createRes = await Workflows.createSingle({
		data: {
			collection_key: data.collectionKey,
			document_id: data.documentId,
			version_id: data.versionId,
			stage_key: workflow.initial,
			created_by: data.userId,
			updated_by: data.userId,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: undefined };
};

export default createProposal;
