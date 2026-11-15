import { canReadReference } from "../../../libs/agent/references.js";
import type { PermissionGrant } from "../../../libs/permission/has-permission.js";
import type {
	AgentReferenceInput,
	MediaOwnership,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import mediaOwnership from "./media-ownership.js";
import requestReadFacts from "./request-read-facts.js";

/**
 * Loads reference ownership and request read facts to check the principal's read access.
 * @remarks Without a grant the principal is the system.
 */
const referenceAccess: ServiceFn<
	[
		{
			references: AgentReferenceInput[];
			userId: number | null;
			grant?: PermissionGrant;
		},
	],
	{
		ownership: Map<number, MediaOwnership>;
		canRead: (reference: AgentReferenceInput) => boolean;
	}
> = async (context, input) => {
	const [ownership, requests] = await Promise.all([
		mediaOwnership(context, {
			mediaIds: input.references.flatMap((reference) =>
				reference.type === "media" ? [reference.mediaId] : [],
			),
		}),
		requestReadFacts(context, {
			requestIds: input.references.flatMap((reference) =>
				reference.type === "request" ? [reference.requestId] : [],
			),
		}),
	]);
	if (ownership.error) return ownership;
	if (requests.error) return requests;

	return {
		error: undefined,
		data: {
			ownership: ownership.data,
			canRead: (reference) =>
				canReadReference({
					reference,
					ownership:
						reference.type === "media"
							? ownership.data.get(reference.mediaId)
							: undefined,
					request:
						reference.type === "request"
							? requests.data.get(reference.requestId)
							: undefined,
					userId: input.userId,
					grant: input.grant,
				}),
		},
	};
};

export default referenceAccess;
