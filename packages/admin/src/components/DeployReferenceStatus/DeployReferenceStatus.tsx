import classNames from "classnames";
import { TbOutlineClock } from "solid-icons/tb";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import DeployRunHistory from "@/components/DeployRunHistory/DeployRunHistory";
import DeployRunProgress from "@/components/DeployRunProgress/DeployRunProgress";
import { useDeployClock } from "@/hooks/useDeployClock/useDeployClock";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import {
	canViewDeploys,
	getDeployDetailClass,
	getDeploySummary,
} from "@/utils/deploys";

/**
 * Live status for chat references. `time` shows the last deploy on hover; `runs` shows history or
 * progress. Falls back to "Deploy" when inaccessible or removed.
 */
const DeployReferenceStatus: Component<{
	deployKey: string;
	part: "time" | "runs";
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const deploys = api.deploys.useGetMultiple({ enabled: canViewDeploys });

	// ----------------------------------------
	// Memos
	const list = createMemo(() => deploys.data?.data ?? []);
	const now = useDeployClock(list);
	const deploy = createMemo(() =>
		list().find((item) => item.key === props.deployKey),
	);
	const summary = createMemo(() => {
		const current = deploy();
		return current ? getDeploySummary(current, now()) : undefined;
	});
	//* "Live · 3 November 2026 at 15:18", or the status line while nothing has finished to date it
	const when = createMemo(() => {
		const current = deploy();
		const status = summary();
		if (!current || !status) return undefined;

		const date =
			status.state === "deploying"
				? current.runningRun?.startedAt
				: status.state === "queued" ||
					  status.state === "off" ||
					  status.state === "ready"
					? undefined
					: current.recentRuns[0]?.finishedAt;
		return date
			? `${status.label} · ${dateHelpers.formatDate(date, { includeTime: true })}`
			: status.detail;
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.part === "time"}>
				<Show when={when()}>
					{(label) => (
						<span
							role="img"
							aria-label={label()}
							title={label()}
							class={classNames(
								"flex shrink-0 transition-colors duration-300",
								getDeployDetailClass(summary()?.tone ?? "muted"),
							)}
						>
							<TbOutlineClock size={11} />
						</span>
					)}
				</Show>
			</Match>
			<Match when={deploys.isLoading}>
				<span class="skeleton mt-1.5 block h-0.75 w-full" />
			</Match>
			<Match when={summary()?.state === "deploying"}>
				<DeployRunProgress
					progress={summary()?.progress ?? null}
					slots={12}
					variant="segments"
					class="mt-1.5"
				/>
			</Match>
			<Match when={deploy()}>
				{(deploy) => (
					<DeployRunHistory
						deploy={deploy()}
						slots={12}
						variant="segments"
						class="mt-1.5"
					/>
				)}
			</Match>
			<Match when={!deploy()}>{T()("deploys.deploy")}</Match>
		</Switch>
	);
};

export default DeployReferenceStatus;
