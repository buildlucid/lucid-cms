import type { DocumentWorkflow } from "@lucidcms/types";
import collections from "../../libs/collection/collections.js";
import { documentWorkflowsFormatter } from "../../libs/formatters/index.js";
import { DocumentWorkflowsRepository } from "../../libs/repositories/index.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
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
	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (!getWorkflowConfig(collectionRes.data)) {
		return {
			error: undefined,
			data: null,
		};
	}

	const Workflows = new DocumentWorkflowsRepository(context.db);

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
			mediaOptions: {
				host: getBaseUrl(context),
				delivery: context.mediaDelivery,
				imagePresets: context.config.media.images.presets,
			},
		}),
	};
};

export default getSingle;
