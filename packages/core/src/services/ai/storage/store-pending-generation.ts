import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { AiUsageSessionType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Records an accepted generation as pending, so polling can complete it. */
const storePendingGeneration: ServiceFn<
	[
		{
			lucidRemoteConnectionId: number;
			userId: number;
			session: { type: AiUsageSessionType; id?: string };
			requestId: string;
			feature: {
				key: string;
				version: string;
			};
		},
	],
	undefined
> = async (context, props) => {
	const AiGenerations = new AiGenerationsRepository(context.db);

	const createRes = await AiGenerations.createIfRequestAbsent({
		data: {
			request_id: props.requestId,
			feature_key: props.feature.key,
			feature_version: props.feature.version,
			user_id: props.userId,
			lucid_remote_connection_id: props.lucidRemoteConnectionId,
			session_type: props.session.type,
			session_id: props.session.id ?? props.requestId,
			status: "pending",
		},
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default storePendingGeneration;
