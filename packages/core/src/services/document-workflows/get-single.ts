import type { DocumentWorkflow } from "@lucidcms/types";
import { documentWorkflowsFormatter } from "../../libs/formatters/index.js";
import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getCollectionInstance from "../collections/get-single-instance.js";
import { getWorkflowConfig } from "./helpers/index.js";

const getSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
		},
	],
	DocumentWorkflow | null
> = async (context, data) => {
	const collectionRes = getCollectionInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (!getWorkflowConfig(collectionRes.data)) {
		return {
			error: undefined,
			data: null,
		};
	}

	const Workflows = new DocumentWorkflowsRepository(
		context.db.client,
		context.config.db,
	);

	const workflowRes = await Workflows.selectSingleDetailed({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
	});
	if (workflowRes.error) return workflowRes;

	return {
		error: undefined,
		data: documentWorkflowsFormatter.formatSingle({
			collection: collectionRes.data,
			workflow: workflowRes.data,
			host: getBaseUrl(context),
		}),
	};
};

export default getSingle;
