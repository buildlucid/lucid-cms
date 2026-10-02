import type { AgentConversation } from "@types";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidClock,
	FaSolidRobot,
	FaSolidT,
	FaSolidTag,
} from "solid-icons/fa";
import { type Component, createSignal, Index } from "solid-js";
import AgentConversationTableRow from "@/components/AgentConversationTableRow/AgentConversationTableRow";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import Link from "@/components/Link/Link";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import Table from "@/components/Table/Table";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import { getNewChatHref } from "@/utils/home-view";

const AgentHistoryList: Component<{ searchParams: QueryStateResponse }> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [selected, setSelected] = createSignal<AgentConversation>();
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const conversations = api.agent.useGetConversations({
		queryParams: { queryString: props.searchParams.queryString },
		enabled: () => props.searchParams.ready(),
		idleRefetchInterval: 30_000,
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				error={conversations.isError && !conversations.data}
				empty={conversations.data?.data.length === 0}
				queryState={props.searchParams}
				emptyFallback={
					<EmptyState
						title={T()("agent.home.empty.title")}
						description={T()("agent.home.empty.description")}
						actions={
							<Link href={getNewChatHref()} size="sm">
								{T()("agent.history.empty.action")}
							</Link>
						}
					/>
				}
				class="flex-1 h-full"
			>
				<Table.Root
					id="agent.history.list"
					rowCount={conversations.data?.data.length ?? 0}
					queryState={props.searchParams}
					loading={conversations.isPending || conversations.isPlaceholderData}
					columns={[
						{
							label: T()("common.title"),
							key: "title",
							icon: <FaSolidT />,
							sortable: true,
							minWidth: 320,
						},
						{
							label: T()("common.status"),
							key: "status",
							icon: <FaSolidCircleCheck />,
							minWidth: 140,
						},
						{
							label: T()("agent.select.label"),
							key: "agentKey",
							icon: <FaSolidRobot />,
							minWidth: 160,
						},
						{
							label: T()("common.type"),
							key: "type",
							icon: <FaSolidTag />,
							minWidth: 140,
						},
						{
							label: T()("common.updated.at"),
							key: "updatedAt",
							icon: <FaSolidClock />,
							sortable: true,
							minWidth: 180,
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							icon: <FaSolidCalendar />,
							sortable: true,
							minWidth: 180,
						},
					]}
				>
					<Index each={conversations.data?.data ?? []}>
						{(conversation, index) => (
							<AgentConversationTableRow
								index={index}
								conversation={conversation()}
								onRename={() => {
									setSelected(conversation());
									setRenameOpen(true);
								}}
								onDelete={() => {
									setSelected(conversation());
									setDeleteOpen(true);
								}}
							/>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={props.searchParams}
				meta={conversations.data?.meta}
				padding="md"
			/>
			<RenameAgentConversationModal
				conversation={selected}
				state={{ open: renameOpen(), setOpen: setRenameOpen }}
			/>
			<DeleteAgentConversationModal
				id={() => selected()?.id}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
			/>
		</>
	);
};

export default AgentHistoryList;
