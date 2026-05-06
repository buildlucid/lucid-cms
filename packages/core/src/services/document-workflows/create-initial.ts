import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollectionInstance from "../collections/get-single-instance.js";
import { getWorkflowConfig } from "./helpers/index.js";

const createInitial: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const collectionRes = getCollectionInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const workflow = getWorkflowConfig(collectionRes.data);
	if (!workflow) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Workflows = new DocumentWorkflowsRepository(
		context.db.client,
		context.config.db,
	);

	const existingRes = await Workflows.selectSingle({
		select: ["id"],
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "=", value: data.documentId },
		],
	});
	if (existingRes.error) return existingRes;
	if (existingRes.data) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const workflowRes = await Workflows.createSingle({
		data: {
			collection_key: data.collectionKey,
			document_id: data.documentId,
			stage_key: workflow.initial,
			created_by: data.userId,
			updated_by: data.userId,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (workflowRes.error) return workflowRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createInitial;
