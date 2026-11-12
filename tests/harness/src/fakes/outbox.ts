/** The email adapter key the `outbox` fragment registers, which `harness:outbox` is read from. */
export const OUTBOX_ADAPTER_KEY = "harness-outbox";

/** One email the CMS sent, as the outbox keeps it. */
export type OutboxEmail = {
	to: string;
	subject: string;
	template: string;
	/** What the template was rendered with, including links the CMS never stores. */
	data: Record<string, unknown>;
};
