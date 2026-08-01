import type { Config } from "../../types/config.js";
import type {
	AdapterKeys,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import reportTelemetry from "./report.js";
import type {
	TelemetryCommand,
	TelemetryOutcome,
	TelemetryStage,
} from "./types.js";

export type CommandTelemetryReporter = {
	report: (result: {
		outcome: TelemetryOutcome;
		stage: TelemetryStage;
		adapterKeys?: AdapterKeys;
	}) => Promise<void>;
};

/** Creates a once-only reporter for one initial CLI command invocation. */
const createCommandTelemetryReporter = (options: {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	projectRoot: string;
	command: TelemetryCommand;
	startedAt: number;
}): CommandTelemetryReporter => {
	let reported = false;

	return {
		report: async (result) => {
			if (reported) return;
			reported = true;

			await reportTelemetry({
				...options,
				...result,
				durationMs: Date.now() - options.startedAt,
			});
		},
	};
};

export default createCommandTelemetryReporter;
