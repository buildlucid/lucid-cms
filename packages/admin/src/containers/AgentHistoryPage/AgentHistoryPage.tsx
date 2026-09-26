import { useLocation } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import AgentHeader from "@/components/AgentHeader/AgentHeader";
import AgentHistoryList from "@/components/AgentHistoryList/AgentHistoryList";
import type { FilterField } from "@/components/FilterPanel/FilterPanel";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import useQueryState, {
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import { runStatusFilters } from "@/utils/agent-chat";

/** Every chat the user can see, as a table they can filter and sort. */
const AgentHistoryPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	//* the agent home's search link opens this page with the filters showing
	const location = useLocation<{ filtersOpen?: boolean }>();
	const [filtersOpen, setFiltersOpen] = createSignal(
		location.state?.filtersOpen === true,
	);
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				title: textFilter(),
				agentKey: textFilter(),
				routineId: textFilter(),
				status: textFilter(),
			},
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
				title: sort(),
			},
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	const routines = api.agent.useGetRoutines();

	// ----------------------------------------
	// Memos
	const filterFields = createMemo(() => {
		const agents = getAgentAccess().all;
		const fields: FilterField[] = [
			{ label: T()("common.title"), key: "title", type: "text" },
			{
				label: T()("common.status"),
				key: "status",
				type: "select",
				options: runStatusFilters.map((status) => ({
					value: status.value,
					label: T()(status.label),
				})),
			},
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
		if (routines.data?.data.length) {
			fields.push({
				label: T()("agent.history.routine"),
				key: "routineId",
				type: "select",
				options: routines.data.data.map((routine) => ({
					value: routine.id,
					label: routine.name,
				})),
			});
		}
		return fields;
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<AgentHeader
				title={T()("routes.agent.history")}
				description={T()("routes.agent.history.description")}
			>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() =>
						queryClient.invalidateQueries({
							queryKey: queryKeys.agent.conversations(),
						})
					}
					filterSubject={T()("agent.history.subject")}
					filterFields={filterFields()}
					filtersOpen={filtersOpen()}
					onFiltersOpenChange={setFiltersOpen}
					sorts={[
						{ label: T()("common.updated.at"), key: "updatedAt" },
						{ label: T()("common.created.at"), key: "createdAt" },
						{ label: T()("common.title"), key: "title" },
					]}
					perPage
				/>
			</AgentHeader>
			<PageLayout.Body>
				<AgentHistoryList searchParams={searchParams} />
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentHistoryPage;
