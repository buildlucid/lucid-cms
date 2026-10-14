import type { AgentMemory } from "@types";
import {
	TbOutlineCalendar,
	TbOutlineLetterT,
	TbOutlineUser,
} from "solid-icons/tb";
import { type Component, createMemo, Index } from "solid-js";
import AgentMemoryTableRow from "@/components/AgentMemoryTableRow/AgentMemoryTableRow";
import Table, { type TableSelectActionItem } from "@/components/Table/Table";
import api from "@/services/api";
import T from "@/translations";

/** Lists memories with optional edit and delete actions. */
const AgentMemoryTable: Component<{
	id: string;
	memories: AgentMemory[];
	editable: boolean;
	loading: boolean;
	onEdit: (_memory: AgentMemory) => void;
	onDelete: (_memory: AgentMemory) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteMemories = api.agent.useDeleteMemories();

	// ----------------------------------------
	// Memos
	const selectActions = createMemo<TableSelectActionItem[]>(() =>
		props.editable
			? [
					{
						label: T()("common.delete"),
						icon: "trash",
						variant: "danger",
						confirm: {
							title: T()("modals.agent.memories.delete.title"),
							description: T()("modals.agent.memories.delete.description"),
							confirmVariant: "danger",
						},
						onClick: async (selected) => {
							const ids = props.memories
								.filter((_, index) => selected[index])
								.map((memory) => memory.id);
							if (ids.length) await deleteMemories.action.mutateAsync({ ids });
						},
					},
				]
			: [],
	);

	// ----------------------------------------
	// Render
	return (
		<div class="overflow-hidden rounded-md border border-border bg-card">
			<Table.Root
				id={props.id}
				rowCount={props.memories.length}
				loading={props.loading}
				loadingRows={3}
				selectActions={selectActions()}
				padding="sm"
				variant="secondary"
				class="-mb-px"
				columns={[
					{
						label: T()("agent.memory.content"),
						key: "content",
						icon: <TbOutlineLetterT />,
						minWidth: 360,
					},
					{
						label: T()("agent.memory.updated.by"),
						key: "updatedBy",
						icon: <TbOutlineUser />,
						minWidth: 180,
					},
					{
						label: T()("common.updated.at"),
						key: "updatedAt",
						icon: <TbOutlineCalendar />,
					},
				]}
			>
				<Index each={props.memories}>
					{(memory, index) => (
						<AgentMemoryTableRow
							index={index}
							memory={memory()}
							editable={props.editable}
							onEdit={() => props.onEdit(memory())}
							onDelete={() => props.onDelete(memory())}
						/>
					)}
				</Index>
			</Table.Root>
		</div>
	);
};

export default AgentMemoryTable;
