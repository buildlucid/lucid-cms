import { canReadReference } from "../../../libs/agent/references.js";
import { copy } from "../../../libs/i18n/index.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { MediaOwnership } from "../../../types/response.js";

/** Checks permitted library media and the acting person's personal media, hiding other personal and system media as missing to prevent ID probing. */
const agentMediaAccessError = (props: {
	mediaId: number;
	ownership: MediaOwnership;
	authority: AgentToolAuthority;
}): LucidErrorData | undefined => {
	const { principal } = props.authority;
	if (
		canReadReference({
			reference: { type: "media", mediaId: props.mediaId },
			ownership: props.ownership,
			userId: principal.type === "user" ? principal.userId : null,
			grant: principal.type === "user" ? props.authority : undefined,
		})
	) {
		return undefined;
	}

	if (props.ownership.type !== "library") {
		return {
			type: "basic",
			status: 404,
			message: copy("server:core.media.not.found.message"),
		};
	}

	return {
		type: "basic",
		status: 403,
		message: copy("server:agent.media.source.denied"),
	};
};

export default agentMediaAccessError;
