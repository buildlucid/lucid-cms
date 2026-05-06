import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollectionInstance from "../collections/get-single-instance.js";
import {
	getWorkflowConfig,
	workflowStageAllowsTarget,
} from "./helpers/index.js";

const canPublishTarget: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
		},
	],
	undefined
> = async (context, data) => {
	const collectionRes = getCollectionInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (!getWorkflowConfig(collectionRes.data)) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Workflows = new DocumentWorkflowsRepository(
		context.db.client,
		context.config.db,
	);
	const workflowRes = await Workflows.selectSingle({
		select: ["stage_key"],
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "=", value: data.documentId },
		],
	});
	if (workflowRes.error) return workflowRes;

	if (
		workflowStageAllowsTarget({
			collection: collectionRes.data,
			stageKey: workflowRes.data?.stage_key,
			target: data.target,
		})
	) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	return {
		error: {
			type: "basic",
			message: T("document_workflow_publish_not_allowed"),
			status: 403,
		},
		data: undefined,
	};
};

export default canPublishTarget;
