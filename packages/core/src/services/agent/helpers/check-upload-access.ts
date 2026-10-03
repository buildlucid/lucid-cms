import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";

/**
 * Checks the user has an agent workflow permission and it accepts media uploads. Chat
 * uploads are personal, so they don't need media library permissions.
 */
const checkUploadAccess: ServiceFn<
	[{ userId: number; agentKey: string }],
	undefined
> = async (context, input) => {
	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: input.agentKey,
	});
	if (access.error) return access;

	if (!access.data.agent.features.media.upload) {
		return {
			data: undefined,
			error: {
				type: "authorisation",
				status: 403,
				message: copy("server:agent.references.denied"),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default checkUploadAccess;
