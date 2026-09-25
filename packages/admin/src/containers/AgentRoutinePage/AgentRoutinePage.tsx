import { A, useNavigate, useParams } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import Button from "@/components/Button/Button";
import DateText from "@/components/DateText/DateText";
import DeleteAgentRoutineModal from "@/components/DeleteAgentRoutineModal/DeleteAgentRoutineModal";
import DetailsList from "@/components/DetailsList/DetailsList";
import EmptyState from "@/components/EmptyState/EmptyState";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoadingState from "@/components/LoadingState/LoadingState";
import PageLayout from "@/components/PageLayout/PageLayout";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import api from "@/services/api";
import T from "@/translations";
import { describeSchedule } from "@/utils/agent-schedule";

const pageSize = 10;

/** A routine's instructions and schedule, with each run it has made. */
const AgentRoutinePage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ routineId: string }>();
	const navigate = useNavigate();
	const [editOpen, setEditOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [perPage, setPerPage] = createSignal(pageSize);

	// ----------------------------------------
	// Queries & Mutations
	const routineQuery = api.agent.useGetRoutine({ id: () => params.routineId });
	const runs = api.agent.useGetRoutineRuns({
		id: () => params.routineId,
		perPage,
	});
	const updateRoutine = api.agent.useUpdateRoutine();
	const runRoutine = api.agent.useRunRoutine({
		onSuccess: (response) =>
			navigate(`/lucid/agent/chats/${response.data.conversationId}`),
	});

	// ----------------------------------------
	// Memos
	const routine = createMemo(() => routineQuery.data?.data);
	const hasMore = createMemo(
		() => (runs.data?.meta.total ?? 0) > (runs.data?.data.length ?? 0),
	);

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={routine()?.title}
				description={
					routine()
						? `${describeSchedule(routine()?.cron ?? "")} · ${routine()?.timezone}`
						: undefined
				}
				actions={
					<Show when={routine()}>
						{(current) => (
							<>
								<Button
									size="sm"
									loading={runRoutine.action.isPending}
									onClick={() => runRoutine.action.mutate({ id: current().id })}
								>
									{T()("agent.routine.run.now")}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setEditOpen(true)}
								>
									{T()("common.edit")}
								</Button>
								<ActionMenu
									actions={[
										{
											label: current().enabled
												? T()("agent.routine.pause")
												: T()("agent.routine.resume"),
											type: "button",
											icon: "clock",
											onClick: () =>
												updateRoutine.action.mutate({
													id: current().id,
													body: { enabled: !current().enabled },
												}),
										},
										{
											label: T()("common.delete"),
											type: "button",
											icon: "trash",
											variant: "danger",
											onClick: () => setDeleteOpen(true),
										},
									]}
								/>
							</>
						)}
					</Show>
				}
			/>
			<PageLayout.Body padding="md">
				<Switch>
					<Match when={routineQuery.isError}>
						<ErrorState
							title={T()("agent.routine.missing.title")}
							description={T()("agent.routine.missing.description")}
							actions={
								<Link variant="primary" size="sm" href="/lucid/agent/routines">
									{T()("routes.agent.routines")}
								</Link>
							}
						/>
					</Match>
					<Match when={routine()}>
						{(current) => (
							<div class="mx-auto flex w-full max-w-4xl flex-col gap-8">
								<section class="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
									<div class="rounded-md border border-border bg-card p-4">
										<h2 class="mb-2 text-sm font-medium text-title">
											{T()("agent.routine.instructions")}
										</h2>
										<p class="whitespace-pre-wrap break-words text-sm leading-6 text-body">
											{current().instructions}
										</p>
									</div>
									<DetailsList
										items={[
											{
												label: T()("common.status"),
												type: "pill",
												value: current().enabled
													? T()("agent.routine.active")
													: T()("agent.routine.paused"),
												pillVariant: current().enabled
													? "success-subtle"
													: "neutral",
											},
											{
												label: T()("agent.routine.next.run"),
												value: current().enabled ? (
													<DateText
														date={current().nextRunAt}
														includeTime={true}
													/>
												) : (
													"-"
												),
											},
											{
												label: T()("common.created.at"),
												value: <DateText date={current().createdAt} />,
											},
										]}
									/>
								</section>

								<section class="flex flex-col gap-3">
									<h2 class="text-sm font-medium text-title">
										{T()("agent.routine.runs")}
									</h2>
									<Show
										when={runs.data?.data.length}
										fallback={
											<EmptyState
												class="rounded-md border border-dashed border-border"
												title={T()("agent.routine.runs.empty.title")}
												description={T()(
													"agent.routine.runs.empty.description",
												)}
											/>
										}
									>
										<ul class="overflow-hidden rounded-md border border-border bg-card">
											<For each={runs.data?.data}>
												{(run) => (
													<li class="border-b border-border last:border-b-0">
														<A
															href={`/lucid/agent/chats/${run.conversationId}`}
															class="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
														>
															<div class="min-w-0 grow">
																<DateText
																	date={run.createdAt}
																	includeTime={true}
																	class="text-sm font-medium text-title"
																/>
																<p class="mt-0.5 line-clamp-2 text-sm text-body">
																	{run.summary ??
																		run.errorMessage ??
																		T()("agent.routine.run.no.summary")}
																</p>
															</div>
															<div class="flex shrink-0 flex-col items-end gap-1">
																<AgentRunStatus
																	status={run.status}
																	outcome={run.outcome}
																/>
																<span class="text-xs text-muted">
																	{T()("agent.routine.run.credits", {
																		credits: run.usage.creditsCharged,
																	})}
																</span>
															</div>
														</A>
													</li>
												)}
											</For>
										</ul>
									</Show>
									<Show when={hasMore()}>
										<Button
											variant="ghost"
											size="sm"
											class="self-center"
											loading={runs.isFetching}
											onClick={() => setPerPage((count) => count + pageSize)}
										>
											{T()("common.show_more")}
										</Button>
									</Show>
								</section>
							</div>
						)}
					</Match>
					<Match when={true}>
						<LoadingState />
					</Match>
				</Switch>
			</PageLayout.Body>
			<UpsertAgentRoutineDrawer
				routine={routine}
				state={{ open: editOpen(), setOpen: setEditOpen }}
			/>
			<DeleteAgentRoutineModal
				id={() => params.routineId}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
				onDeleted={() => navigate("/lucid/agent/routines")}
			/>
		</PageLayout.Root>
	);
};

export default AgentRoutinePage;
