import type { Deploy, DeployRun, DeployRunStatus } from "@types";
import type { PillVariant } from "@/components/Pill/Pill";
import { getDeployPermission } from "@/constants/permissions";
import { useAdminConfig } from "@/hooks/useAdminConfig/useAdminConfig";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

/** Viewing any configured deploy, which the deploys page and navigation control need. */
export const getDeploysViewRequirement = () => ({
	some: useAdminConfig().deploys.map((key) => getDeployPermission(key, "read")),
});

/**
 * Whether the person can view any configured deploy, which shows the deploy controls.
 * @remarks Read inside a memo or effect to track changes.
 */
export const canViewDeploys = () =>
	useAdminConfig().deploys.length > 0 &&
	userStore.get.meetsRequirement(getDeploysViewRequirement());

/** Whether a deploy has triggers waiting, or a run queued, starting or running. */
export const isDeployBusy = (deploy: Deploy) =>
	deploy.pending !== null ||
	deploy.queuedRun !== null ||
	deploy.runningRun !== null;

/** Whether a run hasn't finished yet, so it can be cancelled. */
export const isDeployRunCancellable = (run: Pick<DeployRun, "status">) =>
	run.status === "queued" ||
	run.status === "starting" ||
	run.status === "running";

/**
 * Cancellation mode: drop a queued run, cancel on the host, or stop waiting locally.
 * @remarks Starting runs lack the host ID needed for remote cancellation.
 */
export type DeployRunCancellation = "queued" | "host" | "waiting";

export const getDeployRunCancellation = (
	deploy: Pick<Deploy, "cancellable">,
	run: Pick<DeployRun, "status">,
): DeployRunCancellation => {
	if (run.status === "queued") return "queued";
	return run.status === "running" && deploy.cancellable ? "host" : "waiting";
};

/** The action's label, such as "Cancel Run" or "Stop Waiting". */
export const getDeployRunCancelLabel = (
	deploy: Pick<Deploy, "cancellable">,
	run: Pick<DeployRun, "status">,
) => {
	switch (getDeployRunCancellation(deploy, run)) {
		case "queued":
			return T()("deploys.run.cancel.queued");
		case "host":
			return T()("deploys.run.cancel");
		case "waiting":
			return T()("deploys.run.stop.waiting");
	}
};

/** The colour family a deploy or run shows in, shared by pills, marks and the run history. */
export type DeployTone =
	| "active"
	| "queued"
	| "success"
	| "danger"
	| "warning"
	| "muted";

export const deployRunTones: Record<DeployRunStatus, DeployTone> = {
	queued: "queued",
	starting: "active",
	running: "active",
	succeeded: "success",
	triggered: "success",
	failed: "danger",
	"timed-out": "warning",
	cancelled: "muted",
};

export const deployTonePills: Record<DeployTone, PillVariant> = {
	active: "blue-subtle",
	queued: "outline",
	success: "success-subtle",
	danger: "danger-subtle",
	warning: "warning-subtle",
	muted: "outline",
};

export const deployToneText: Record<DeployTone, string> = {
	active: "text-blue-low-foreground",
	queued: "text-subtitle",
	success: "text-success-low-foreground",
	danger: "text-danger-low-foreground",
	warning: "text-warning-low-foreground",
	muted: "text-subtitle",
};

/** Colours a status line only when it needs a look, so live and idle deploys stay quiet. */
export const getDeployDetailClass = (tone: DeployTone) =>
	tone === "active" || tone === "danger" || tone === "warning"
		? deployToneText[tone]
		: "text-muted";

export const getDeployRunStatusLabel = (status: DeployRunStatus) => {
	switch (status) {
		case "queued":
			return T()("deploys.status.queued");
		case "starting":
			return T()("deploys.status.starting");
		case "running":
			return T()("deploys.status.running");
		case "succeeded":
			return T()("deploys.status.succeeded");
		case "failed":
			return T()("deploys.status.failed");
		case "triggered":
			return T()("deploys.status.triggered");
		case "timed-out":
			return T()("deploys.status.timed.out");
		case "cancelled":
			return T()("deploys.status.cancelled");
	}
};

/** How a run started, such as "Trigger · 4 changes" or "Manual · Will". */
export const getDeployRunSourceLabel = (run: DeployRun) => {
	switch (run.source) {
		case "trigger":
			return T()("deploys.source.trigger", { count: run.triggerCount });
		case "schedule":
			return T()("deploys.source.schedule");
		case "toolkit":
			return T()("deploys.source.toolkit");
		case "agent":
			return T()("deploys.source.agent", {
				name: run.agent?.name ?? T()("deploys.source.agent.label"),
			});
		case "manual":
			return run.startedBy
				? T()("deploys.source.manual.by", {
						name:
							[run.startedBy.firstName, run.startedBy.lastName]
								.filter(Boolean)
								.join(" ") || run.startedBy.username,
					})
				: T()("deploys.source.manual");
	}
};

/** How long a finished run took, in milliseconds. */
export const getDeployRunDuration = (run: DeployRun) => {
	const startedAt = Date.parse(run.startedAt ?? "");
	const finishedAt = Date.parse(run.finishedAt ?? "");
	if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) return null;
	return Math.max(0, finishedAt - startedAt);
};

/** The middle duration of the deploy's recent successful runs, for estimating a run's progress. */
export const getTypicalDeployDuration = (deploy: Deploy) => {
	const durations = deploy.recentRuns
		.filter((run) => run.status === "succeeded")
		.map(getDeployRunDuration)
		.filter((duration) => duration !== null)
		.sort((a, b) => a - b);
	return durations[Math.floor(durations.length / 2)] || null;
};

/** Elapsed time as a clock, such as "1:05" or "1:02:05". */
export const formatElapsed = (ms: number) => {
	const total = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = String(total % 60).padStart(2, "0");

	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
		: `${minutes}:${seconds}`;
};

export type DeployState =
	| "off"
	| "deploying"
	| "queued"
	| "failed"
	| "timed-out"
	| "succeeded"
	| "triggered"
	| "cancelled"
	| "ready";

export type DeploySummary = {
	state: DeployState;
	tone: DeployTone;
	/** The state on its own, such as "Live" or "Deploying". */
	label: string;
	/** A short line such as "Live 4 minutes ago" or "Deploying · 1:20". */
	detail: string;
	/** When the summary last changed, for picking the most recent among equals. */
	at: number;
	/**
	 * How far the running run is through a typical run, from 0 to 1. Null while there's nothing to
	 * compare against, or once the run takes longer than usual.
	 */
	progress: number | null;
};

/** Where a deploy stands, for the navigation control, the deploys page and the Home widget. */
export const getDeploySummary = (
	deploy: Deploy,
	now: number,
): DeploySummary => {
	if (!deploy.enabled) {
		return {
			state: "off",
			tone: "muted",
			label: T()("deploys.summary.off"),
			detail: T()("deploys.summary.off"),
			at: Date.parse(deploy.disabledAt ?? "") || 0,
			progress: null,
		};
	}

	if (deploy.runningRun) {
		const startedAt =
			Date.parse(
				deploy.runningRun.startedAt ?? deploy.runningRun.createdAt ?? "",
			) || now;
		const elapsed = now - startedAt;
		const typical = getTypicalDeployDuration(deploy);
		return {
			state: "deploying",
			tone: "active",
			label: T()("deploys.status.running"),
			detail: T()("deploys.summary.deploying", {
				time: formatElapsed(elapsed),
			}),
			at: startedAt,
			progress:
				typical !== null && elapsed < typical
					? Math.max(elapsed / typical, 0.04)
					: null,
		};
	}

	if (deploy.queuedRun || deploy.pending) {
		const readyAt = deploy.pending ? Date.parse(deploy.pending.readyAt) : null;
		return {
			state: "queued",
			tone: "queued",
			label: T()("deploys.status.queued"),
			detail:
				deploy.queuedRun || readyAt === null || readyAt <= now
					? T()("deploys.summary.queued.soon")
					: T()("deploys.summary.queued", {
							time:
								dateHelpers.formatRelativeDate(deploy.pending?.readyAt, now) ??
								"",
						}),
			at: now,
			progress: null,
		};
	}

	const last = deploy.recentRuns[0];
	if (!last) {
		return {
			state: "ready",
			tone: "muted",
			label: T()("deploys.summary.ready"),
			detail: T()("deploys.summary.ready"),
			at: 0,
			progress: null,
		};
	}

	const finishedAt = last.finishedAt ?? last.createdAt;
	const time = dateHelpers.formatRelativeDate(finishedAt, now) ?? "";
	const at = Date.parse(finishedAt ?? "") || 0;
	const tone = deployRunTones[last.status];
	switch (last.status) {
		case "succeeded":
			return {
				state: "succeeded",
				tone,
				label: T()("deploys.summary.live"),
				detail: T()("deploys.summary.succeeded", { time }),
				at,
				progress: null,
			};
		case "triggered":
			return {
				state: "triggered",
				tone,
				label: T()("deploys.status.triggered"),
				detail: T()("deploys.summary.triggered", { time }),
				at,
				progress: null,
			};
		case "failed":
			return {
				state: "failed",
				tone,
				label: T()("deploys.status.failed"),
				detail: T()("deploys.summary.failed", { time }),
				at,
				progress: null,
			};
		case "timed-out":
			return {
				state: "timed-out",
				tone,
				label: T()("deploys.status.timed.out"),
				detail: T()("deploys.summary.timed.out", { time }),
				at,
				progress: null,
			};
		default:
			return {
				state: "cancelled",
				tone: "muted",
				label: T()("deploys.status.cancelled"),
				detail: T()("deploys.summary.cancelled", { time }),
				at,
				progress: null,
			};
	}
};

/**
 * Lower ranks lead when several deploys share one summary: work in progress, then everything
 * that's finished or never run, then deploys that are off.
 */
const stateRanks: Record<DeployState, number> = {
	deploying: 0,
	queued: 1,
	failed: 2,
	"timed-out": 2,
	succeeded: 2,
	triggered: 2,
	cancelled: 2,
	ready: 2,
	off: 3,
};

/** Selects an active deploy first, otherwise the most recently changed deploy. */
export const getLeadingDeploy = (deploys: Deploy[], now: number) =>
	deploys
		.map((deploy) => ({ deploy, summary: getDeploySummary(deploy, now) }))
		.sort(
			(a, b) =>
				stateRanks[a.summary.state] - stateRanks[b.summary.state] ||
				b.summary.at - a.summary.at,
		)[0];

/** What the rocket button does, which queues a run behind the one already going. */
export const getDeployRunLabel = (deploy: Deploy) => {
	if (!deploy.enabled) return T()("deploys.off.hint");
	return deploy.runningRun
		? T()("deploys.run.queue.label", { name: deploy.name })
		: T()("deploys.run.label", { name: deploy.name });
};

/** Where the deploys page shows a deploy, so other screens can link straight to it. */
export const getDeployHref = (key: string) =>
	`/admin/system/deploys#deploy-${key}`;
