import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** A request needs as many approvals as the strictest of its collections. */
const getRequiredApprovals = (
	context: ServiceContext,
	collectionKeys: string[],
) =>
	Math.max(
		constants.collectionBuilder.publishing.approvals,
		...collectionKeys.map(
			(key) =>
				context.config.collections.find((collection) => collection.key === key)
					?.getData.publishing.review?.approvals ??
				constants.collectionBuilder.publishing.approvals,
		),
	);

export default getRequiredApprovals;
