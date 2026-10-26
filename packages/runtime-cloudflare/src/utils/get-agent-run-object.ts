import { LucidError } from "@lucidcms/core/runtime";
import type { ServiceContext } from "@lucidcms/core/types";
import { AGENT_RUNS_BINDING } from "../constants.js";
import type { AgentRunNamespace } from "../types.js";

/** Gets the Durable Object that executes a run, from the namespace Lucid binds to the Worker. */
const getAgentRunObject = (context: ServiceContext, runId: string) => {
	const namespace = context.env?.[AGENT_RUNS_BINDING] as
		| AgentRunNamespace
		| undefined;
	if (!namespace) {
		throw new LucidError({
			message: `Agent runs need the "${AGENT_RUNS_BINDING}" Durable Object binding, which Lucid adds to the Worker's config.`,
		});
	}

	return namespace.get(namespace.idFromName(runId));
};

export default getAgentRunObject;
