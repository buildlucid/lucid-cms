import { canReadReference } from "../../../libs/agent/references.js";
import type { PermissionGrant } from "../../../libs/permission/has-permission.js";
import type {
	AgentReferenceInput,
	MediaOwnership,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import mediaOwnership from "./media-ownership.js";
import requestCollections from "./request-collections.js";

/**
 * Loads reference ownership and request collections to check the principal's read access.
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
	const [ownership, collections] = await Promise.all([
		mediaOwnership(context, {
			mediaIds: input.references.flatMap((reference) =>
				reference.type === "media" ? [reference.mediaId] : [],
			),
		}),
		requestCollections(context, {
			requestIds: input.references.flatMap((reference) =>
				reference.type === "request" ? [reference.requestId] : [],
			),
		}),
	]);
	if (ownership.error) return ownership;
	if (collections.error) return collections;

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
					requestCollections:
						reference.type === "request"
							? collections.data.get(reference.requestId)
							: undefined,
					userId: input.userId,
					grant: input.grant,
				}),
		},
	};
};

export default referenceAccess;
