import { Popover } from "@kobalte/core";
import { A, useLocation } from "@solidjs/router";
import type { Deploy } from "@types";
import classNames from "classnames";
import {
	TbOutlineArrowRight,
	TbOutlineRocket,
	TbOutlineSelector,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DeployRunHistory from "@/components/DeployRunHistory/DeployRunHistory";
import DeployRunProgress from "@/components/DeployRunProgress/DeployRunProgress";
import { menuItemClasses } from "@/components/Menu/itemClasses";
import { menuPanelClasses } from "@/components/Menu/panelClasses";
import RunDeployModal from "@/components/RunDeployModal/RunDeployModal";
import { getDeployPermission } from "@/constants/permissions";
import { useDeployClock } from "@/hooks/useDeployClock/useDeployClock";
import T from "@/translations";
import {
	type DeploySummary,
	getDeployDetailClass,
	getDeployHref,
	getDeployRunLabel,
	getDeploySummary,
	getLeadingDeploy,
} from "@/utils/deploys";

/** A deploy's name over its status line, with its recent runs, or its progress while deploying, as segments underneath. */
const DeployText: Component<{
	title: string;
	detail: string;
	summary: DeploySummary;
	deploy: Deploy;
}> = (props) => (
	<span class="min-w-0 flex-1">
		<span class="block truncate text-xs font-medium text-title">
			{props.title}
		</span>
		<span
			class={classNames(
				"block truncate text-2xs tabular-nums transition-colors duration-300",
				getDeployDetailClass(props.summary.tone),
			)}
		>
			{props.detail}
		</span>
		<Show
			when={props.summary.state === "deploying"}
			fallback={
				<DeployRunHistory
					deploy={props.deploy}
					slots={12}
					variant="segments"
					class="mt-1.5"
				/>
			}
		>
			<DeployRunProgress
				progress={props.summary.progress}
				slots={12}
				variant="segments"
				class="mt-1.5"
			/>
		</Show>
	</span>
);

/** The rocket that asks before running a deploy. */
const RunButton: Component<{ deploy: Deploy; onRun: () => void }> = (props) => (
	<Button
		type="button"
		variant="ghost"
		size="xs"
		shape="square"
		permission={getDeployPermission(props.deploy.key, "run")}
		disabled={!props.deploy.enabled}
		aria-label={getDeployRunLabel(props.deploy)}
		tooltip={getDeployRunLabel(props.deploy)}
		onClick={props.onRun}
	>
		<TbOutlineRocket class="size-3.5" />
	</Button>
);

/** A single deploy standing in the navigation: its status links to its card, and the rocket runs it. */
const DeployRow: Component<{
	deploy: Deploy;
	now: number;
	onNavigate?: () => void;
	onRun: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const summary = createMemo(() => getDeploySummary(props.deploy, props.now));

	// ----------------------------------------
	// Render
	return (
		<div class="mb-2 flex items-center gap-2 rounded-xl pe-1.5 transition-colors hover:bg-background-hover">
			<A
				href={getDeployHref(props.deploy.key)}
				class="flex min-w-0 flex-1 rounded-xl py-2 ps-3 focus-ring"
				onClick={() => props.onNavigate?.()}
			>
				<DeployText
					title={props.deploy.name}
					detail={summary().detail}
					summary={summary()}
					deploy={props.deploy}
				/>
			</A>
			<RunButton deploy={props.deploy} onRun={props.onRun} />
		</div>
	);
};

/** One deploy in the list of several, styled like a menu item. */
const DeployMenuItem: Component<{
	deploy: Deploy;
	now: number;
	onNavigate: () => void;
	onRun: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const summary = createMemo(() => getDeploySummary(props.deploy, props.now));

	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center gap-1 rounded-md pe-1 transition-colors hover:bg-card-hover">
			<A
				href={getDeployHref(props.deploy.key)}
				class="flex min-w-0 flex-1 flex-col rounded-md px-2 py-1.5 focus-ring"
				onClick={props.onNavigate}
			>
				<span class="truncate text-sm text-title">{props.deploy.name}</span>
				<span
					class={classNames(
						"truncate text-xs tabular-nums",
						getDeployDetailClass(summary().tone),
					)}
				>
					{summary().detail}
				</span>
			</A>
			<RunButton deploy={props.deploy} onRun={props.onRun} />
		</div>
	);
};

/**
 * Deploy status above the account menu. One deploy shows as a row, and several collapse into a
 * popover led by the one that needs attention. Hidden until deploys are configured.
 */
export const NavigationDeploys: Component<{
	deploys: Deploy[];
	onNavigate?: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const now = useDeployClock(() => props.deploys);
	const [listOpen, setListOpen] = createSignal(false);
	const [runTarget, setRunTarget] = createSignal<string>();
	const [runOpen, setRunOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const single = createMemo(() =>
		props.deploys.length === 1 ? props.deploys[0] : undefined,
	);
	const leading = createMemo(() => getLeadingDeploy(props.deploys, now()));
	const runDeploy = createMemo(() =>
		props.deploys.find((deploy) => deploy.key === runTarget()),
	);

	// ----------------------------------------
	// Functions
	const openRun = (deploy: Deploy) => {
		setListOpen(false);
		setRunTarget(deploy.key);
		setRunOpen(true);
	};
	const navigate = () => {
		setListOpen(false);
		props.onNavigate?.();
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => location.pathname + location.hash,
			() => setListOpen(false),
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<Show
				when={single()}
				fallback={
					<Show when={leading()}>
						{(leading) => (
							<Popover.Root
								open={listOpen()}
								onOpenChange={setListOpen}
								placement="top-start"
								gutter={8}
							>
								<Popover.Trigger
									class="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start focus-ring transition-colors hover:bg-background-hover data-expanded:bg-background-hover"
									aria-label={T()("deploys.menu.open")}
								>
									<DeployText
										title={T()("routes.system.deploys.title")}
										detail={T()("deploys.summary.named", {
											name: leading().deploy.name,
											detail: leading().summary.detail,
										})}
										summary={leading().summary}
										deploy={leading().deploy}
									/>
									<TbOutlineSelector class="size-3.5 shrink-0 text-muted" />
								</Popover.Trigger>
								<Popover.Portal>
									<Popover.Content
										class={classNames(
											menuPanelClasses({ dividers: false }),
											"w-72",
										)}
										onOpenAutoFocus={(event) => event.preventDefault()}
									>
										<ul class="flex flex-col gap-0.5">
											<For each={props.deploys}>
												{(deploy) => (
													<li>
														<DeployMenuItem
															deploy={deploy}
															now={now()}
															onNavigate={navigate}
															onRun={() => openRun(deploy)}
														/>
													</li>
												)}
											</For>
										</ul>
										<hr class="-mx-1.5 my-2 h-px border-0 bg-border" />
										<A
											href="/admin/system/deploys"
											class={menuItemClasses({})}
											onClick={navigate}
										>
											<span class="flex-1">{T()("deploys.menu.view.all")}</span>
											<TbOutlineArrowRight class="size-3 shrink-0 text-muted rtl:rotate-180" />
										</A>
									</Popover.Content>
								</Popover.Portal>
							</Popover.Root>
						)}
					</Show>
				}
			>
				{(deploy) => (
					<DeployRow
						deploy={deploy()}
						now={now()}
						onNavigate={props.onNavigate}
						onRun={() => openRun(deploy())}
					/>
				)}
			</Show>
			<RunDeployModal
				deploy={runDeploy()}
				open={runOpen()}
				onOpenChange={setRunOpen}
			/>
		</>
	);
};
