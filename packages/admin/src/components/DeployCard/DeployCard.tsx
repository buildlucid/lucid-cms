import type { Deploy, DeployRun } from "@types";
import classNames from "classnames";
import {
	TbOutlineArrowUpRight,
	TbOutlineInfoCircle,
	TbOutlineRocket,
} from "solid-icons/tb";
import {
	type Component,
	createMemo,
	For,
	type JSXElement,
	Show,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import Copy from "@/components/Copy/Copy";
import DeployRunHistory from "@/components/DeployRunHistory/DeployRunHistory";
import DeployRunProgress from "@/components/DeployRunProgress/DeployRunProgress";
import { getDeployPermission } from "@/constants/permissions";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import {
	deployToneText,
	getDeployRunCancelLabel,
	getDeployRunDuration,
	getDeployRunSourceLabel,
	getDeploySummary,
	getTypicalDeployDuration,
} from "@/utils/deploys";
import formatDuration from "@/utils/format-duration";
import helpers from "@/utils/helpers";

const Fact: Component<{ label: string; children: JSXElement }> = (props) => (
	<div class="flex min-w-0 items-baseline gap-1.5">
		<dt class="shrink-0 text-muted">{props.label}</dt>
		<dd class="min-w-0 text-subtitle">{props.children}</dd>
	</div>
);

/** Shows deploy configuration, current status, recent runs and actions. */
const DeployCard: Component<{
	deploy: Deploy;
	now: number;
	/** Rings the card, such as after following a link to it. */
	highlighted?: boolean;
	onRun: () => void;
	onSetState: () => void;
	onCancelRun: (run: DeployRun) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const summary = createMemo(() => getDeploySummary(props.deploy, props.now));
	const typical = createMemo(() => getTypicalDeployDuration(props.deploy));
	const headline = createMemo(() =>
		summary().state === "deploying" || summary().state === "queued"
			? summary().detail
			: summary().label,
	);
	//* the lines under the headline, such as when it finished and who started it
	const lines = createMemo(() => {
		const deploy = props.deploy;
		if (!deploy.enabled) {
			return [
				deploy.disabledBy
					? T()("deploys.turned.off.by", {
							name: helpers.formatUserName(deploy.disabledBy, "name"),
						})
					: undefined,
				dateHelpers.formatDate(deploy.disabledAt, { includeTime: true }),
			].filter((line) => line !== undefined);
		}

		const run = deploy.runningRun ?? deploy.queuedRun;
		if (run) return [getDeployRunSourceLabel(run)];
		if (deploy.pending) {
			return [T()("deploys.waiting.value", { count: deploy.pending.count })];
		}

		const last = deploy.recentRuns[0];
		if (!last) return [];
		const duration = getDeployRunDuration(last);
		return [
			[
				dateHelpers.formatRelativeDate(
					last.finishedAt ?? last.createdAt,
					props.now,
				),
				duration !== null
					? T()("deploys.took", { time: formatDuration(duration) })
					: undefined,
			]
				.filter(Boolean)
				.join(" · "),
			getDeployRunSourceLabel(last),
		];
	});
	//* only the run the panel describes, so a waiting or turned off deploy doesn't link an older one
	const runUrl = createMemo(() => {
		switch (summary().state) {
			case "deploying":
				return props.deploy.runningRun?.url ?? null;
			case "succeeded":
			case "triggered":
			case "failed":
			case "timed-out":
			case "cancelled":
				return props.deploy.recentRuns[0]?.url ?? null;
			default:
				return null;
		}
	});
	const failure = createMemo(() => {
		const last = props.deploy.recentRuns[0];
		if (props.deploy.runningRun || !last?.message) return null;
		return last.status === "failed" || last.status === "timed-out"
			? last.message
			: null;
	});
	//* the menu needs a label even while the action is hidden
	const cancelRunningLabel = createMemo(() => {
		const run = props.deploy.runningRun;
		return run
			? getDeployRunCancelLabel(props.deploy, run)
			: T()("deploys.run.cancel");
	});
	const timing = createMemo(() => {
		const progress = summary().progress;
		const usual = typical();
		if (usual === null) return undefined;
		if (summary().state !== "deploying") {
			return T()("deploys.usually", { time: formatDuration(usual) });
		}
		if (progress === null) return T()("deploys.longer.than.usual");
		return T()("deploys.remaining", {
			time: formatDuration(Math.max(usual * (1 - progress), 1000)),
		});
	});

	// ----------------------------------------
	// Render
	return (
		<article
			id={`deploy-${props.deploy.key}`}
			class={classNames(
				"grid scroll-mt-24 overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-500 md:grid-cols-[minmax(0,1fr)_16rem]",
				props.highlighted
					? "border-primary-low-border ring-2 ring-primary-low-border"
					: "border-border",
			)}
		>
			<div class="flex min-w-0 flex-col">
				<div class="min-w-0 p-4">
					<h3 class="truncate text-sm font-medium">{props.deploy.name}</h3>
					<Show when={props.deploy.description}>
						<p class="mt-1 max-w-4xl text-sm">{props.deploy.description}</p>
					</Show>
					<Show when={props.deploy.links.length > 0}>
						<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
							<For each={props.deploy.links}>
								{(link) => (
									<li>
										<a
											href={link.url}
											target="_blank"
											rel="noreferrer"
											class="inline-flex items-center gap-1 text-xs font-medium text-subtitle transition-colors hover:text-primary-hover"
										>
											{link.label}
											<TbOutlineArrowUpRight class="size-3" />
										</a>
									</li>
								)}
							</For>
						</ul>
					</Show>
				</div>
				<dl class="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-xs">
					<Fact label={T()("deploys.provider")}>
						<code class="font-mono">{props.deploy.provider}</code>
					</Fact>
					<Fact label={T()("deploys.triggers")}>
						<Show
							when={props.deploy.triggers.length > 0}
							fallback={T()("deploys.triggers.none")}
						>
							<span class="flex flex-wrap gap-x-3 gap-y-1">
								<For each={props.deploy.triggers}>
									{(trigger) => <code class="font-mono">{trigger}</code>}
								</For>
							</span>
						</Show>
					</Fact>
					<Show when={props.deploy.schedule}>
						{(schedule) => (
							<Fact label={T()("common.schedule")}>
								<code class="font-mono">{schedule().cron}</code>
								<Show when={schedule().nextRunAt}>
									{(nextRunAt) => (
										<span class="text-muted">
											{" · "}
											{T()("deploys.schedule.next", {
												time:
													dateHelpers.formatRelativeDate(
														nextRunAt(),
														props.now,
													) ?? "",
											})}
										</span>
									)}
								</Show>
							</Fact>
						)}
					</Show>
					<Show when={props.deploy.webhookUrl}>
						{(url) => (
							<Fact label={T()("deploys.webhook.url")}>
								<Copy.Button
									value={url()}
									label={T()("deploys.webhook.copy")}
									class="text-xs [&>span]:text-xs"
								/>
							</Fact>
						)}
					</Show>
				</dl>
			</div>

			<div class="flex min-w-0 flex-col gap-3 border-t border-border bg-background p-4 md:border-t-0 md:border-l">
				<div class="min-w-0" title={timing()}>
					<div class="flex items-center gap-1.5">
						<p
							class={classNames(
								"truncate text-sm font-medium tabular-nums",
								deployToneText[summary().tone],
							)}
						>
							{headline()}
						</p>
						<Show when={failure()}>
							{(message) => (
								<span
									role="img"
									aria-label={message()}
									title={message()}
									class="flex shrink-0 text-danger-low-foreground"
								>
									<TbOutlineInfoCircle class="size-3.5" />
								</span>
							)}
						</Show>
						<Show when={runUrl()}>
							{(url) => (
								<a
									href={url()}
									target="_blank"
									rel="noreferrer"
									class="ms-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-subtitle transition-colors hover:text-primary-hover"
								>
									{T()("deploys.view.run")}
									<TbOutlineArrowUpRight class="size-3" />
								</a>
							)}
						</Show>
					</div>
					<For each={lines()}>
						{(line) => (
							<p class="mt-0.5 truncate text-xs tabular-nums text-muted">
								{line}
							</p>
						)}
					</For>
				</div>
				<Show
					when={summary().state === "deploying"}
					fallback={<DeployRunHistory deploy={props.deploy} />}
				>
					<DeployRunProgress progress={summary().progress} title={timing()} />
				</Show>
				<div class="mt-auto flex items-center gap-1.5 pt-1">
					<Button
						type="button"
						size="sm"
						variant="outline"
						permission={getDeployPermission(props.deploy.key, "run")}
						disabled={!props.deploy.enabled}
						class="flex-1"
						onClick={props.onRun}
					>
						<TbOutlineRocket class="mr-1.5 size-3.5" />
						{props.deploy.runningRun
							? T()("deploys.run.queue")
							: T()("deploys.run")}
					</Button>
					<ActionMenu
						size="md"
						actions={[
							{
								type: "button",
								label: T()("deploys.enable"),
								icon: "check",
								onClick: props.onSetState,
								permission: getDeployPermission(props.deploy.key, "manage"),
								show: !props.deploy.enabled,
								sortOrder: 30,
							},
							{
								type: "button",
								label: cancelRunningLabel(),
								icon: "ban",
								onClick: () => {
									const run = props.deploy.runningRun;
									if (run) props.onCancelRun(run);
								},
								permission: getDeployPermission(props.deploy.key, "manage"),
								show: props.deploy.runningRun !== null,
								variant: "danger",
								sortOrder: 70,
							},
							{
								type: "button",
								label: T()("deploys.run.cancel.queued"),
								icon: "ban",
								onClick: () => {
									const run = props.deploy.queuedRun;
									if (run) props.onCancelRun(run);
								},
								permission: getDeployPermission(props.deploy.key, "manage"),
								show: props.deploy.queuedRun !== null,
								variant: "danger",
								sortOrder: 75,
							},
							{
								type: "button",
								label: T()("deploys.disable"),
								icon: "cloud-off",
								onClick: props.onSetState,
								permission: getDeployPermission(props.deploy.key, "manage"),
								show: props.deploy.enabled,
								variant: "danger",
								sortOrder: 80,
							},
						]}
					/>
				</div>
			</div>
		</article>
	);
};

export default DeployCard;
