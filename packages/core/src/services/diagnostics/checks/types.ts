import type { DiagnosticCheckStep } from "../../../types/response.js";

/** Check findings. The runner derives status and duration from step results. */
export type DiagnosticCheckOutcome = {
	adapter: string | null;
	steps: DiagnosticCheckStep[];
	/** Why the check didn't run, such as no adapter being configured. */
	skipped?: string;
	/** Extra detail for a passed check, such as the test email's delivery status. */
	message?: string;
};
