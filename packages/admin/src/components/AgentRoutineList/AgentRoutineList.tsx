import { A, useNavigate } from "@solidjs/router";
import type { AgentRoutine } from "@types";
import { type Component, createSignal, For, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import DateText from "@/components/DateText/DateText";
import DeleteAgentRoutineModal from "@/components/DeleteAgentRoutineModal/DeleteAgentRoutineModal";
import Pill from "@/components/Pill/Pill";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import api from "@/services/api";
import T from "@/translations";
import { describeSchedule } from "@/utils/agent-schedule";

/** Routines as rows with their schedule, last run and actions. */
const AgentRoutineList: Component<{ routines: AgentRoutine[] }> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const navigate = useNavigate();
	const [selected, setSelected] = createSignal<AgentRoutine>();
	const [editOpen, setEditOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const updateRoutine = api.agent.useUpdateRoutine();
	const runRoutine = api.agent.useRunRoutine({
		onSuccess: (response) =>
			navigate(`/lucid/agent/chats/${response.data.conversationId}`),
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<ul class="overflow-hidden rounded-md border border-border bg-card">
				<For each={props.routines}>
					{(routine) => (
						<li class="relative flex items-center gap-4 border-b border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-card-hover">
							<A
								href={`/lucid/agent/routines/${routine.id}`}
								class="min-w-0 grow after:absolute after:inset-0 focus:outline-hidden focus-visible:after:ring-1 focus-visible:after:ring-inset focus-visible:after:ring-primary"
							>
								<span class="block truncate text-sm font-medium text-title">
									{routine.title}
								</span>
								<span class="mt-0.5 block truncate text-xs text-muted">
									{describeSchedule(routine.cron)} · {routine.timezone}
								</span>
							</A>
							<div class="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted sm:flex">
								<Show
									when={routine.enabled}
									fallback={
										<Pill size="xs" variant="neutral">
											{T()("agent.routine.paused")}
										</Pill>
									}
								>
									<span>
										{T()("agent.routine.next")}{" "}
										<DateText date={routine.nextRunAt} includeTime={true} />
									</span>
								</Show>
							</div>
							<Show when={routine.lastRun}>
								{(run) => (
									<AgentRunStatus
										status={run().status}
										outcome={run().outcome}
									/>
								)}
							</Show>
							<div class="relative z-10">
								<ActionMenu
									actions={[
										{
											label: T()("agent.routine.run.now"),
											type: "button",
											icon: "sparkle",
											loading:
												runRoutine.action.isPending &&
												runRoutine.action.variables?.id === routine.id,
											onClick: () =>
												runRoutine.action.mutate({ id: routine.id }),
										},
										{
											label: routine.enabled
												? T()("agent.routine.pause")
												: T()("agent.routine.resume"),
											type: "button",
											icon: "clock",
											onClick: () =>
												updateRoutine.action.mutate({
													id: routine.id,
													body: { enabled: !routine.enabled },
												}),
										},
										{
											label: T()("common.edit"),
											type: "button",
											icon: "pen",
											onClick: () => {
												setSelected(routine);
												setEditOpen(true);
											},
										},
										{
											label: T()("common.delete"),
											type: "button",
											icon: "trash",
											variant: "danger",
											onClick: () => {
												setSelected(routine);
												setDeleteOpen(true);
											},
										},
									]}
								/>
							</div>
						</li>
					)}
				</For>
			</ul>
			<UpsertAgentRoutineDrawer
				routine={selected}
				state={{ open: editOpen(), setOpen: setEditOpen }}
			/>
			<DeleteAgentRoutineModal
				id={() => selected()?.id}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
			/>
		</>
	);
};

export default AgentRoutineList;
