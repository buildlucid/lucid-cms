import {
	referenceKey,
	referenceNotFoundError,
	referenceReadPermission,
} from "../../../libs/agent/references.js";
import { getAgent } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import describe from "./describe.js";

/** Checks attachments against the agent's settings, the sender's current access and whether each resource exists. */
const checkInput: ServiceFn<
	[{ userId: number; agentKey: string; references: AgentReferenceInput[] }],
	undefined
> = async (context, input) => {
	if (!input.references.length) return { error: undefined, data: undefined };

	const agent = getAgent(context.config, input.agentKey);
	const [access, details] = await Promise.all([
		resolveUserAccess(context, { userId: input.userId }),
		describe(context, { references: input.references }),
	]);
	if (access.error) return access;
	if (details.error) return details;

	for (const reference of input.references) {
		const attachable =
			reference.type === "media"
				? agent?.attachments.media
				: agent?.attachments.documents;

		if (
			!attachable ||
			!hasPermission(access.data, referenceReadPermission(reference))
		) {
			return {
				data: undefined,
				error: {
					type: "authorisation",
					status: 403,
					message: copy("server:agent.references.denied"),
				},
			};
		}

		if (!details.data.has(referenceKey(reference))) {
			return { data: undefined, error: referenceNotFoundError(reference) };
		}
	}

	return { error: undefined, data: undefined };
};

export default checkInput;
