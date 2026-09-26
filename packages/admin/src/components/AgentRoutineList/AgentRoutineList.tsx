import { useNavigate } from "@solidjs/router";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidClock,
	FaSolidRobot,
	FaSolidT,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, Index } from "solid-js";
import AgentRoutineTableRow from "@/components/AgentRoutineTableRow/AgentRoutineTableRow";
import DeleteAgentRoutineModal from "@/components/DeleteAgentRoutineModal/DeleteAgentRoutineModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import Table from "@/components/Table/Table";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import ViewAgentRoutineRunsDrawer from "@/components/ViewAgentRoutineRunsDrawer/ViewAgentRoutineRunsDrawer";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

const AgentRoutineList: Component<{ searchParams: QueryStateResponse }> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	//* kept after a drawer closes, so its content stays put while it animates out
	const [selectedId, setSelectedId] = createSignal<string>();
	const [editOpen, setEditOpen] = createSignal(false);
	const [runsOpen, setRunsOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const routines = api.agent.useGetRoutines({
		queryParams: { queryString: props.searchParams.queryString },
		enabled: () => props.searchParams.ready(),
	});
	const updateRoutine = api.agent.useUpdateRoutine();
	const runRoutine = api.agent.useRunRoutine({
		onSuccess: (response) =>
			navigate(`/lucid/agent/chats/${response.data.conversationId}`),
	});

	// ----------------------------------------
	// Memos
	//* read from the list, so the drawer shows the latest copy after an update
	const selected = createMemo(() =>
		routines.data?.data.find((routine) => routine.id === selectedId()),
	);

	// ----------------------------------------
	// Functions
	const open = (id: string, setOpen: (_open: boolean) => void) => {
		setSelectedId(id);
		setOpen(true);
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				error={routines.isError}
				empty={routines.data?.data.length === 0}
				queryState={props.searchParams}
				emptyFallback={
					<EmptyState
						title={T()("agent.routines.empty.title")}
						description={T()("agent.routines.empty.description")}
					/>
				}
				class="h-full flex-1"
			>
				<Table.Root
					id="agent.routines.list"
					rowCount={routines.data?.data.length ?? 0}
					queryState={props.searchParams}
					loading={routines.isFetching}
					columns={[
						{
							label: T()("common.name"),
							key: "name",
							icon: <FaSolidT />,
							sortable: true,
							minWidth: 260,
						},
						{
							label: T()("common.status"),
							key: "enabled",
							icon: <FaSolidCircleCheck />,
						},
						{
							label: T()("agent.select.label"),
							key: "agentKey",
							icon: <FaSolidRobot />,
							minWidth: 160,
						},
						{
							label: T()("common.schedule"),
							key: "schedule",
							icon: <FaSolidClock />,
							minWidth: 240,
						},
						{
							label: T()("agent.routine.next.run"),
							key: "nextRunAt",
							icon: <FaSolidCalendar />,
						},
						{
							label: T()("agent.routine.last.run"),
							key: "lastRun",
							icon: <FaSolidCircleCheck />,
							minWidth: 140,
						},
					]}
				>
					<Index each={routines.data?.data ?? []}>
						{(routine, index) => (
							<AgentRoutineTableRow
								index={index}
								routine={routine()}
								runPending={
									runRoutine.action.isPending &&
									runRoutine.action.variables?.id === routine().id
								}
								onOpen={() => open(routine().id, setEditOpen)}
								onRuns={() => open(routine().id, setRunsOpen)}
								onDelete={() => open(routine().id, setDeleteOpen)}
								onRun={() => runRoutine.action.mutate({ id: routine().id })}
								onToggle={() =>
									updateRoutine.action.mutate({
										id: routine().id,
										body: { enabled: !routine().enabled },
									})
								}
							/>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={props.searchParams}
				meta={routines.data?.meta}
				padding="md"
			/>
			<UpsertAgentRoutineDrawer
				routine={selected}
				state={{ open: editOpen(), setOpen: setEditOpen }}
			/>
			<ViewAgentRoutineRunsDrawer
				id={selectedId}
				state={{ open: runsOpen(), setOpen: setRunsOpen }}
			/>
			<DeleteAgentRoutineModal
				id={selectedId}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
			/>
		</>
	);
};

export default AgentRoutineList;
