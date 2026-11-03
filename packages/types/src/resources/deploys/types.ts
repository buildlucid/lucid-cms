import type { AgentActor } from "../agent/types.js";
import type { UserDisplay } from "../users/types.js";

/**
 * Where a deploy run stands. `starting` runs are being handed to the host, `triggered` means the
 * host accepted one without reporting a status, and `timed-out` that it reported nothing in time.
 */
export type DeployRunStatus =
	| "queued"
	| "starting"
	| "running"
	| "succeeded"
	| "failed"
	| "triggered"
	| "timed-out"
	| "cancelled";

export type DeployRunSource =
	| "trigger"
	| "schedule"
	| "manual"
	| "toolkit"
	| "agent";

export interface DeployRun {
	id: number;
	deployKey: string;
	status: DeployRunStatus;
	source: DeployRunSource;
	/** Triggers batched into the run. */
	triggerCount: number;
	startedBy: UserDisplay | null;
	/** The agent that started the run, for the person in `startedBy` or for the system. */
	agent: AgentActor | null;
	/** The host's page for the run, such as its build log. */
	url: string | null;
	message: string | null;
	createdAt: string | null;
	startedAt: string | null;
	finishedAt: string | null;
}

/** A link shown with a deploy, such as the live site or the host's dashboard. */
export interface DeployLink {
	label: string;
	url: string;
}

/** A configured deploy with its current state. */
export interface Deploy {
	key: string;
	name: string;
	/** What the deploy does, written by the developer for the people who run it. */
	description: string | null;
	links: DeployLink[];
	/** The provider's key, such as `webhook` or `github-actions`. */
	provider: string;
	/** Whether the provider can stop a run on the host. Otherwise cancelling only stops Lucid waiting for it. */
	cancellable: boolean;
	enabled: boolean;
	disabledAt: string | null;
	disabledBy: UserDisplay | null;
	/** Hook events that queue the deploy, such as `documents.afterChange`. */
	triggers: string[];
	schedule: { cron: string; nextRunAt: string | null } | null;
	/** Where the host sends status updates, for providers that receive them. */
	webhookUrl: string | null;
	/** Triggers waiting out the debounce before they become a run. */
	pending: { count: number; readyAt: string } | null;
	/** The run waiting to start, which starts once the running one finishes. */
	queuedRun: DeployRun | null;
	runningRun: DeployRun | null;
	/** The latest runs that finished, newest first. */
	recentRuns: DeployRun[];
}
