import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitAgentReferencesUnlinkInput = z.input<typeof inputSchema>;

/** Unlinks resources from a chat however they were linked, including managed and user-attached references. */
const unlink = (
	context: ServiceContext,
	input: ToolkitAgentReferencesUnlinkInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: unlinkReferences }, { default: serviceWrapper }] =
				await Promise.all([
					import("../../../../../services/agent/references/unlink.js"),
					import("../../../../../utils/services/service-wrapper.js"),
				]);

			return serviceWrapper(unlinkReferences, { transaction: true })(
				context,
				data,
			);
		},
		name: {
			key: "core.toolkit.agent.references.unlink.error.name",
			defaultMessage: "Agent Toolkit Error",
		},
		message: {
			key: "core.toolkit.agent.references.unlink.error.message",
			defaultMessage: "Lucid toolkit could not unlink the chat references.",
		},
	});

export default unlink;
