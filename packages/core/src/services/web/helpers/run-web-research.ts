import type {
	WebRequest,
	WebResponse,
} from "../../../libs/lucid-remote/schema/web.js";
import researchWeb from "../../../libs/lucid-remote/services/research-web/index.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import runPaidToolRequest from "../../agent/helpers/run-paid-tool-request.js";

/** Runs a paid web request for an agent tool call and records its usage against the run. */
const runWebResearch: ServiceFn<
	[{ execution: AgentToolExecution; request: WebRequest }],
	WebResponse
> = (context, { execution, request }) =>
	runPaidToolRequest(context, {
		execution,
		featureKey: request.feature.key,
		timeoutMs: 90_000,
		send: (paid) => researchWeb(context, { ...paid, request }),
	});

export default runWebResearch;
