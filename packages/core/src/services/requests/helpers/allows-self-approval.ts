import type { ServiceContext } from "../../../utils/services/types.js";

const allowsSelfApproval = (
	context: ServiceContext,
	collectionKeys: string[],
) =>
	collectionKeys.every(
		(key) =>
			context.config.collections.find((collection) => collection.key === key)
				?.getData.publishing.review?.selfApproval === true,
	);

export default allowsSelfApproval;
