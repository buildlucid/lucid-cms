import type { DiagnosticCheckStep } from "../../../types/response.js";

/** Runs one check step, recording anything it throws as the step's error. */
const runStep = async (
	name: string,
	step: () => Promise<unknown>,
): Promise<DiagnosticCheckStep> => {
	try {
		await step();
		return { name, error: null };
	} catch (error) {
		return {
			name,
			error: error instanceof Error ? error.message : String(error),
		};
	}
};

export default runStep;
