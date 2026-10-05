import { ReleaseTargetsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const createTargets: ServiceFn<
	[{ releaseDocumentId: number; targets: string[] }],
	undefined
> = async (context, data) => {
	const ReleaseTargets = new ReleaseTargetsRepository(context.db);

	if (data.targets.length === 0) return { error: undefined, data: undefined };

	const createRes = await ReleaseTargets.createMultiple({
		data: data.targets.map((target) => ({
			release_document_id: data.releaseDocumentId,
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
