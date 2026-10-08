import type { AgentReferenceSnapshot } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitAgentReferencesLinkInput } from "./references/link/index.js";
import link from "./references/link/index.js";
import type { ToolkitAgentReferencesUnlinkInput } from "./references/unlink/index.js";
import unlink from "./references/unlink/index.js";

export type ToolkitAgent = {
	references: {
		/** Links resources to a chat as managed references that only the toolkit can unlink. */
		link: (
			input: ToolkitAgentReferencesLinkInput,
		) => ServiceResponse<AgentReferenceSnapshot[]>;
		/** Unlinks resources from a chat however they were linked. */
		unlink: (
			input: ToolkitAgentReferencesUnlinkInput,
		) => ServiceResponse<undefined>;
	};
};

export const createAgentToolkit = (context: ServiceContext): ToolkitAgent => ({
	references: {
		link: (input) => link(context, input),
		unlink: (input) => unlink(context, input),
	},
});

export default createAgentToolkit;
