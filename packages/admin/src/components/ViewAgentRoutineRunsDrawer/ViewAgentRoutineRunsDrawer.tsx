import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidCoins,
	FaSolidT,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import AgentRunTableRow from "@/components/AgentRunTableRow/AgentRunTableRow";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import Table from "@/components/Table/Table";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import { runStatusFilters } from "@/utils/agent-chat";

interface ViewAgentRoutineRunsDrawerProps {
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ViewAgentRoutineRunsDrawer: Component<ViewAgentRoutineRunsDrawerProps> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.agent.routine.runs.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("panels.agent.routine.runs.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
				<ViewAgentRoutineRunsContent {...props} />
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

const ViewAgentRoutineRunsContent: Component<
	ViewAgentRoutineRunsDrawerProps
> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				status: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		singleSort: true,
	});
	const [filtersOpen, setFiltersOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const canFetch = createMemo(
		() => props.state.open && props.id() !== undefined && searchParams.ready(),
	);

	// ----------------------------------------
	// Queries
	const runs = api.agent.useGetRoutineRuns({
		id: props.id,
		queryParams: { queryString: searchParams.queryString },
		enabled: canFetch,
	});

	// ----------------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<Show when={props.id() !== undefined}>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-2.5">
					<div class="flex gap-2.5">
						<FilterToggle
							open={filtersOpen()}
							onOpenChange={setFiltersOpen}
							queryState={searchParams}
						/>
						<QuerySort
							sorts={[{ label: T()("common.created.at"), key: "createdAt" }]}
							queryState={searchParams}
						/>
					</div>
					<PerPageSelect options={[5, 10, 20]} queryState={searchParams} />
				</div>
				<FilterPanel
					open={filtersOpen()}
					onOpenChange={setFiltersOpen}
					subject={T()("panels.agent.routine.runs.title")}
					fields={[
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: runStatusFilters.map((status) => ({
								value: status.value,
								label: T()(status.label),
							})),
						},
					]}
					queryState={searchParams}
					embedded={true}
				/>
				<QueryBoundary
					error={runs.isError}
					empty={runs.data?.data.length === 0}
					queryState={searchParams}
					emptyFallback={
						<EmptyState
							title={T()("agent.routine.runs.empty.title")}
							description={T()("agent.routine.runs.empty.description")}
						/>
					}
					class="h-full flex-1 rounded-md border border-border bg-card"
				>
					<Table.Root
						id="agent.routine.runs"
						rowCount={runs.data?.data.length ?? 0}
						queryState={searchParams}
						columns={[
							{
								label: T()("common.status"),
								key: "status",
								icon: <FaSolidCircleCheck />,
							},
							{
								label: T()("agent.routine.run.summary"),
								key: "summary",
								icon: <FaSolidT />,
								minWidth: 420,
							},
							{
								label: T()("agent.routine.run.credits.label"),
								key: "credits",
								icon: <FaSolidCoins />,
								minWidth: 100,
							},
							{
								label: T()("common.created.at"),
								key: "createdAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
							{
								label: T()("common.finished.at"),
								key: "finishedAt",
								icon: <FaSolidCalendar />,
							},
						]}
						loading={runs.isFetching}
						padding="sm"
						variant="secondary"
					>
						<Index each={runs.data?.data ?? []}>
							{(run, index) => <AgentRunTableRow index={index} run={run()} />}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={runs.data?.meta}
					variant="inline"
				/>
			</Show>
		</div>
	);
};

export default ViewAgentRoutineRunsDrawer;
