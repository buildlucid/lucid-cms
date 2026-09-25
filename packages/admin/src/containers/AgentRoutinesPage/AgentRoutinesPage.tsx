import { type Component, createSignal, Match, Switch } from "solid-js";
import AgentHeader from "@/components/AgentHeader/AgentHeader";
import AgentRoutineList from "@/components/AgentRoutineList/AgentRoutineList";
import Button from "@/components/Button/Button";
import EmptyState from "@/components/EmptyState/EmptyState";
import LoadingState from "@/components/LoadingState/LoadingState";
import PageLayout from "@/components/PageLayout/PageLayout";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import api from "@/services/api";
import T from "@/translations";

/** Lists the user's routines and creates new ones. */
const AgentRoutinesPage: Component = () => {
	// ----------------------------------------
	// State & Queries
	const [createOpen, setCreateOpen] = createSignal(false);
	const routines = api.agent.useGetRoutines();

	// ----------------------------------------
	// Render
	const createButton = () => (
		<Button size="sm" onClick={() => setCreateOpen(true)}>
			{T()("agent.routine.create")}
		</Button>
	);

	return (
		<PageLayout.Root>
			<AgentHeader actions={createButton()} />
			<PageLayout.Body padding="md">
				<div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
					<Switch>
						<Match when={routines.isLoading}>
							<LoadingState />
						</Match>
						<Match when={routines.data?.data.length}>
							<AgentRoutineList routines={routines.data?.data ?? []} />
						</Match>
						<Match when={true}>
							<EmptyState
								class="rounded-md border border-dashed border-border"
								title={T()("agent.routines.empty.title")}
								description={T()("agent.routines.empty.description")}
								actions={createButton()}
							/>
						</Match>
					</Switch>
				</div>
			</PageLayout.Body>
			<UpsertAgentRoutineDrawer
				state={{ open: createOpen(), setOpen: setCreateOpen }}
			/>
		</PageLayout.Root>
	);
};

export default AgentRoutinesPage;
