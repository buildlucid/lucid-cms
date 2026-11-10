import { useLocation } from "@solidjs/router";
import type { Deploy, DeployRun } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onCleanup,
} from "solid-js";
import CancelDeployRunModal from "@/components/CancelDeployRunModal/CancelDeployRunModal";
import DeployCard from "@/components/DeployCard/DeployCard";
import { DeployRunsList } from "@/components/DeployRunsList/DeployRunsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RunDeployModal from "@/components/RunDeployModal/RunDeployModal";
import SetDeployStateModal from "@/components/SetDeployStateModal/SetDeployStateModal";
import StateNote from "@/components/StateNote/StateNote";
import { useAdminConfig } from "@/hooks/useAdminConfig/useAdminConfig";
import { useDeployClock } from "@/hooks/useDeployClock/useDeployClock";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

const SystemDeploysPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.deploys.title"));
	const location = useLocation();
	const [highlighted, setHighlighted] = createSignal<string>();
	const [runTarget, setRunTarget] = createSignal<string>();
	const [runOpen, setRunOpen] = createSignal(false);
	const [stateTarget, setStateTarget] = createSignal<Deploy>();
	const [stateOpen, setStateOpen] = createSignal(false);
	const [cancelTarget, setCancelTarget] = createSignal<{
		run: DeployRun;
		deploy: Deploy;
	}>();
	const [cancelOpen, setCancelOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const deploys = api.deploys.useGetMultiple({
		enabled: () => useAdminConfig().deploys.length > 0,
	});

	// ----------------------------------------
	// Memos
	const list = createMemo(() => deploys.data?.data ?? []);
	const loaded = createMemo(() => list().length > 0);
	const now = useDeployClock(list);
	//* looked up from the latest poll, so the modal's note follows the deploy while it's open
	const runDeploy = createMemo(() =>
		list().find((deploy) => deploy.key === runTarget()),
	);

	// ----------------------------------------
	// Functions
	const openCancelRun = (run: DeployRun, deploy: Deploy) => {
		setCancelTarget({ run, deploy });
		setCancelOpen(true);
	};

	// ----------------------------------------
	// Effects
	//* links such as the navigation's land on the deploy's card and ring it for a moment
	createEffect(
		on([() => location.hash, loaded], ([hash, ready]) => {
			if (!ready || !hash.startsWith("#deploy-")) return;
			const element = document.getElementById(hash.slice(1));
			if (!element) return;

			const reducedMotion =
				window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
				true;
			element.scrollIntoView({
				behavior: reducedMotion ? "auto" : "smooth",
				block: "center",
			});
			setHighlighted(hash.slice("#deploy-".length));
			const timer = setTimeout(() => setHighlighted(undefined), 2_400);
			onCleanup(() => clearTimeout(timer));
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.deploys.title")}
				description={T()("routes.system.deploys.description")}
			/>
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
					<InfoRow.Root
						title={T()("deploys.configured.title")}
						description={T()("deploys.configured.description")}
					>
						<QueryBoundary
							loading={deploys.isLoading}
							error={deploys.isLoadingError}
							empty={list().length === 0}
							appearance="card"
							onRetry={() => deploys.refetch()}
							loadingFallback={<span class="skeleton block h-72 w-full" />}
							emptyFallback={<StateNote>{T()("deploys.empty")}</StateNote>}
						>
							<div class="flex flex-col gap-4">
								<For each={list()}>
									{(deploy) => (
										<DeployCard
											deploy={deploy}
											now={now()}
											highlighted={highlighted() === deploy.key}
											onRun={() => {
												setRunTarget(deploy.key);
												setRunOpen(true);
											}}
											onSetState={() => {
												setStateTarget(deploy);
												setStateOpen(true);
											}}
											onCancelRun={(run) => openCancelRun(run, deploy)}
										/>
									)}
								</For>
							</div>
						</QueryBoundary>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("deploys.runs.title")}
						description={T()("deploys.runs.description")}
					>
						<DeployRunsList deploys={list()} onCancelRun={openCancelRun} />
					</InfoRow.Root>
				</div>
			</PageLayout.Body>
			<RunDeployModal
				deploy={runDeploy()}
				open={runOpen()}
				onOpenChange={setRunOpen}
			/>
			<SetDeployStateModal
				deploy={stateTarget()}
				open={stateOpen()}
				onOpenChange={setStateOpen}
			/>
			<CancelDeployRunModal
				run={cancelTarget()?.run}
				deploy={cancelTarget()?.deploy}
				open={cancelOpen()}
				onOpenChange={setCancelOpen}
			/>
		</PageLayout.Root>
	);
};

export default SystemDeploysPage;
