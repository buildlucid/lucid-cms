import type z from "zod";
import { getAgent } from "../../../../libs/agent/registry.js";
import type {
	AgentToolExecution,
	AgentToolInteraction,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import type { dataSchema, inputSchema } from "./schema.js";

/** Asks the person to select media in the composer, offering personal files and uploads only when the run acts for them. */
const prepareSelectMedia: ServiceFn<
	[{ input: z.output<typeof inputSchema>; execution: AgentToolExecution }],
	AgentToolInteraction<z.input<typeof dataSchema>>
> = async (context, { input, execution }) => {
	const localeRes = resolveMediaLocale(context, input.contentLocale);
	if (localeRes.error) return localeRes;

	const includePersonal = execution.authority.principal.type === "user";
	const agent = getAgent(context.config, execution.run.agentKey);

	return {
		error: undefined,
		data: {
			interaction: {
				title: input.message,
				placement: "composer",
				data: {
					types: input.types ?? null,
					max: input.max,
					agentKey: execution.run.agentKey,
					includePersonal,
					upload: includePersonal && (agent?.features.media.upload ?? false),
				},
			},
		},
	};
};

export default prepareSelectMedia;
