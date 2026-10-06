import { RequestTargetsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const createTargets: ServiceFn<
	[{ requestDocumentId: number; targets: string[] }],
	undefined
> = async (context, data) => {
	const RequestTargets = new RequestTargetsRepository(context.db);

	if (data.targets.length === 0) return { error: undefined, data: undefined };

	const createRes = await RequestTargets.createMultiple({
		data: data.targets.map((target) => ({
			request_document_id: data.requestDocumentId,
			target,
			reviewed_version_id: null,
			reviewed_by: null,
			approved_version_id: null,
		})),
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: undefined };
};

export default createTargets;
