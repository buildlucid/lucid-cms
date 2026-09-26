import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import AgentHeader from "@/components/AgentHeader/AgentHeader";
import AgentRoutineList from "@/components/AgentRoutineList/AgentRoutineList";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import type { FilterField } from "@/components/FilterPanel/FilterPanel";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import useQueryState, {
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";

const AgentRoutinesPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = createSignal(false);
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				name: textFilter(),
				agentKey: textFilter(),
			},
			sorts: {
				name: sort({ defaultValue: "asc" }),
				createdAt: sort(),
				updatedAt: sort(),
			},
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Memos
	const canCreate = createMemo(() => getAgentAccess().use.length > 0);
	const createActions = createMemo<CreateMenuAction[]>(() =>
		canCreate()
			? [
					{
						type: "button",
						label: T()("agent.routine.create"),
						onClick: () => setCreateOpen(true),
					},
				]
			: [],
	);
	const filterFields = createMemo(() => {
		const agents = getAgentAccess().all;
		const fields: FilterField[] = [
			{ label: T()("common.name"), key: "name", type: "text" },
		];
		if (agents.length > 1) {
			fields.push({
				label: T()("agent.select.label"),
				key: "agentKey",
				type: "select",
				options: agents.map((agent) => ({
					value: agent.key,
					label: agent.name,
				})),
			});
		}
		return fields;
	});

	// ----------------------------------------
	// Hooks
	useKeyboardShortcuts({
		newEntry: {
			permission: () => canCreate(),
			callback: () => setCreateOpen(true),
		},
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<AgentHeader
				title={T()("routes.agent.routines")}
				description={T()("routes.agent.routines.description")}
				actions={<CreateMenu actions={createActions()} />}
			>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() =>
						queryClient.invalidateQueries({
							queryKey: queryKeys.agent.routines(),
						})
					}
					filterSubject={T()("routes.agent.routines")}
					filterFields={filterFields()}
					sorts={[
						{ label: T()("common.name"), key: "name" },
						{ label: T()("common.created.at"), key: "createdAt" },
						{ label: T()("common.updated.at"), key: "updatedAt" },
					]}
					perPage
				/>
			</AgentHeader>
			<PageLayout.Body>
				<AgentRoutineList searchParams={searchParams} />
			</PageLayout.Body>
			<UpsertAgentRoutineDrawer
				state={{ open: createOpen(), setOpen: setCreateOpen }}
			/>
		</PageLayout.Root>
	);
};

export default AgentRoutinesPage;
