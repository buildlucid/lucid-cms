import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getReviewOverview from "../../../review/get-overview.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import type { RequestToolProps } from "../types.js";
import type { outputSchema } from "./schema.js";

/** Reads the Review page's request counts and environment status for the tool's collections. */
const getOverview: ServiceFn<
	[RequestToolProps],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const overviewRes = await getReviewOverview(context, {
		user: userRes.data,
		collectionKeys: props.allowedCollectionKeys,
	});
	if (overviewRes.error) return overviewRes;

	return { error: undefined, data: { output: { data: overviewRes.data } } };
};

export default getOverview;
