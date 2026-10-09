import {
	canReadReference,
	referenceKey,
} from "../../../libs/agent/references.js";
import { getAgent } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import describe from "./describe.js";
import mediaOwnership from "./media-ownership.js";
import referenceNotFound from "./reference-not-found.js";

/** Checks attachments against the agent's settings, the sender's current access and whether each resource exists. Personal media can only be attached by its owner. */
const checkInput: ServiceFn<
	[{ userId: number; agentKey: string; references: AgentReferenceInput[] }],
	undefined
> = async (context, input) => {
	if (!input.references.length) return { error: undefined, data: undefined };

	const agent = getAgent(context.config, input.agentKey);
	const [access, details, ownership] = await Promise.all([
		resolveUserAccess(context, { userId: input.userId }),
		describe(context, { references: input.references }),
		mediaOwnership(context, {
			mediaIds: input.references.flatMap((reference) =>
				reference.type === "media" ? [reference.mediaId] : [],
			),
		}),
	]);
	if (access.error) return access;
	if (details.error) return details;
	if (ownership.error) return ownership;

	for (const reference of input.references) {
		//* requests are only linked by tools for now
		const attachable =
			reference.type === "media"
				? agent?.features.media.attach ||
					(ownership.data.get(reference.mediaId)?.type === "user" &&
						agent?.features.media.upload)
				: reference.type === "document" && agent?.features.documents.attach;

		const detail = details.data.get(referenceKey(reference));

		if (
			!attachable ||
			!canReadReference({
				reference,
				ownership:
					reference.type === "media"
						? ownership.data.get(reference.mediaId)
						: undefined,
				userId: input.userId,
				grant: access.data,
			})
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

		if (!detail) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 404,
					message: referenceNotFound(reference),
				},
			};
		}
	}

	return { error: undefined, data: undefined };
};

export default checkInput;
