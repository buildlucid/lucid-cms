import type { Capability } from "../capabilities/types.ts";
import type { SetupEnvironment } from "../environment/create-environment.ts";
import type { TargetDescription } from "../environment/types.ts";
import type { Mode } from "../setup/types.ts";

/** Prepares what a mode needs from a setup, and says where its lane finds the CMS and what the setup can do. */
const describeTarget = async (
	mode: Mode,
	environment: SetupEnvironment,
): Promise<{ target: TargetDescription; capabilities: Capability[] }> => {
	switch (mode) {
		case "project": {
			return {
				target: { mode },
				capabilities: environment.baseCapabilities,
			};
		}
		case "host": {
			const { template, capabilities } = await environment.database();
			return { target: { mode, template }, capabilities };
		}
		case "served": {
			const { capabilities } = await environment.database();
			return {
				target: { mode, url: await environment.serve() },
				capabilities,
			};
		}
	}
};

export default describeTarget;
