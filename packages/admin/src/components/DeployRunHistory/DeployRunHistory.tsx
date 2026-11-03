import type { Deploy, DeployRun } from "@types";
import classNames from "classnames";
import { type Component, createMemo, For, Show } from "solid-js";
import DeployRunHoverCard from "@/components/DeployRunHoverCard/DeployRunHoverCard";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import {
	type DeployTone,
	deployRunTones,
	getDeployRunDuration,
	getDeployRunStatusLabel,
} from "@/utils/deploys";
import formatDuration from "@/utils/format-duration";

const colours: Record<DeployTone, string> = {
	active: "bg-blue motion-safe:animate-pulse",
	queued: "bg-blue-medium",
	success: "bg-success",
	danger: "bg-danger",
	warning: "bg-warning",
	muted: "bg-muted/40",
};

/** A run's colour, or a faint slot when there's no run. */
const barClasses = (run: DeployRun | null) =>
	classNames(
		"rounded-full",
		run ? colours[deployRunTones[run.status]] : "bg-border",
		{ "opacity-60": run?.status === "triggered" },
	);

/** "Succeeded · 3 Nov 2026, 14:02 · 1m 52s", for screen readers and a segment's tooltip. */
const describeRun = (run: DeployRun) =>
	[
		getDeployRunStatusLabel(run.status),
		dateHelpers.formatDate(run.finishedAt ?? run.startedAt ?? run.createdAt, {
			includeTime: true,
		}),
		formatDuration(getDeployRunDuration(run)),
	]
		.filter(Boolean)
		.join(" · ");

/**
 * Shows recent runs oldest first, with a pulsing active run and faint unused slots. Supports bars,
 * which show each run's details on hover, or line segments.
 * @remarks Segments are hidden from screen readers; their enclosing link supplies the status.
 */
const DeployRunHistory: Component<{
	deploy: Deploy;
	/** @default 20 */
	slots?: number;
	/** @default "bars" */
	variant?: "bars" | "segments";
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const runs = createMemo(() => {
		const slots = props.slots ?? 20;
		const active = props.deploy.runningRun;
		const finished = props.deploy.recentRuns
			.slice(0, active ? slots - 1 : slots)
			.toReversed();
		const shown = active ? [...finished, active] : finished;
		return [
			...Array.from({ length: slots - shown.length }, () => null),
			...shown,
		];
	});
	const segments = createMemo(() => props.variant === "segments");

	// ----------------------------------------
	// Render
	return (
		<ol
			aria-label={segments() ? undefined : T()("deploys.history.label")}
			aria-hidden={segments() ? "true" : undefined}
			class={classNames(
				"flex w-full",
				segments() ? "gap-0.5" : "h-5 items-end gap-[3px]",
				props.class,
			)}
		>
			<For each={runs()}>
				{(run) => (
					<Show
						when={!segments() && run}
						fallback={
							<li
								title={run ? describeRun(run) : undefined}
								aria-hidden={run ? undefined : "true"}
								class={classNames("min-w-0 flex-1", barClasses(run), {
									"h-0.75": segments(),
									"h-1": !segments(),
								})}
							/>
						}
					>
						{(run) => (
							<li class="flex h-full min-w-0 flex-1">
								<DeployRunHoverCard
									run={run()}
									class={classNames(
										"block h-full w-full transition-[filter] duration-150 data-expanded:brightness-125",
										barClasses(run()),
									)}
								/>
								<span class="sr-only">{describeRun(run())}</span>
							</li>
						)}
					</Show>
				)}
			</For>
		</ol>
	);
};

export default DeployRunHistory;
