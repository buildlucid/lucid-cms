import { useQueryClient } from "@tanstack/solid-query";
import type { Deploy, DeployRun } from "@types";
import {
	TbOutlineCalendar,
	TbOutlineCircleCheck,
	TbOutlineClock,
	TbOutlineLetterT,
} from "solid-icons/tb";
import { type Component, createMemo, Index, Show } from "solid-js";
import DeployRunTableRow from "@/components/DeployRunTableRow/DeployRunTableRow";
import InfoRow from "@/components/InfoRow/InfoRow";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import StateNote from "@/components/StateNote/StateNote";
import Table from "@/components/Table/Table";
import { useAdminConfig } from "@/hooks/useAdminConfig/useAdminConfig";
import useQueryState, {
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getDeployRunStatusLabel } from "@/utils/deploys";

/** The deploy run history, filterable by deploy, status and source. */
export const DeployRunsList: Component<{
	deploys: Deploy[];
	onCancelRun: (run: DeployRun, deploy: Deploy) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				deployKey: textFilter(),
				status: textFilter(),
				source: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	const runs = api.deploys.useGetRuns({
		queryParams: { queryString: searchParams.queryString },
		enabled: () => useAdminConfig().deploys.length > 0 && searchParams.ready(),
	});

	// ----------------------------------------
	// Memos
	const showingState = createMemo(
		() => runs.isLoadingError || runs.data?.data.length === 0,
	);
	const showToolbar = createMemo(
		() => !showingState() || !searchParams.filtersAreDefault(),
	);
	const findDeploy = (key: string) =>
		props.deploys.find((deploy) => deploy.key === key);

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-3">
			<Show when={showToolbar()}>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.deploys.all(),
						});
					}}
					filterSubject={T()("deploys.runs.title")}
					filterFields={[
						{
							label: T()("deploys.deploy"),
							key: "deployKey",
							type: "select",
							options: props.deploys.map((deploy) => ({
								label: deploy.name,
								value: deploy.key,
							})),
						},
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: (
								[
									"queued",
									"starting",
									"running",
									"succeeded",
									"failed",
									"triggered",
									"timed-out",
									"cancelled",
								] as const
							).map((status) => ({
								label: getDeployRunStatusLabel(status),
								value: status,
							})),
						},
						{
							label: T()("deploys.source"),
							key: "source",
							type: "select",
							options: [
								{
									label: T()("deploys.source.trigger.label"),
									value: "trigger",
								},
								{ label: T()("deploys.source.schedule"), value: "schedule" },
								{ label: T()("deploys.source.manual"), value: "manual" },
								{ label: T()("deploys.source.toolkit"), value: "toolkit" },
								{
									label: T()("deploys.source.agent.label"),
									value: "agent",
								},
							],
						},
					]}
					perPage
					padding="none"
				/>
			</Show>
			<InfoRow.Content padding="none">
				<QueryBoundary
					appearance="inline"
					error={runs.isLoadingError}
					onRetry={() => runs.refetch()}
					empty={runs.data?.data.length === 0}
					queryState={searchParams}
					emptyFallback={<StateNote>{T()("deploys.runs.empty")}</StateNote>}
					class={showingState() ? "p-4" : undefined}
				>
					<Table.Root
						id="deploys.runs"
						rowCount={runs.data?.data.length ?? 0}
						queryState={searchParams}
						columns={[
							{
								label: T()("common.status"),
								key: "status",
								icon: <TbOutlineCircleCheck />,
							},
							{
								label: T()("deploys.deploy"),
								key: "deploy",
								icon: <TbOutlineLetterT />,
							},
							{
								label: T()("deploys.source"),
								key: "source",
								icon: <TbOutlineLetterT />,
							},
							{
								label: T()("common.started.at"),
								key: "createdAt",
								icon: <TbOutlineCalendar />,
								sortable: true,
							},
							{
								label: T()("common.duration"),
								key: "duration",
								icon: <TbOutlineClock />,
							},
							{
								label: T()("common.message"),
								key: "message",
								icon: <TbOutlineLetterT />,
							},
						]}
						//* background polls keep the rows still, so only new queries show loading
						loading={runs.isLoading}
						stale={runs.isPlaceholderData}
						padding="sm"
						variant="contained"
						class="border-y-0"
					>
						<Index each={runs.data?.data ?? []}>
							{(run, index) => (
								<DeployRunTableRow
									index={index}
									run={run()}
									deploy={findDeploy(run().deployKey)}
									onCancel={(deploy) => props.onCancelRun(run(), deploy)}
								/>
							)}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={runs.data?.meta}
					loading={runs.isLoading}
					variant="footer"
					padding="sm"
					hideWhenEmpty
				/>
			</InfoRow.Content>
		</div>
	);
};
