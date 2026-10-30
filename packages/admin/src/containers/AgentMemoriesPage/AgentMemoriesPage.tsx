import type { AgentMemory, AgentMemoryList, AgentMemoryScope } from "@types";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import AgentMemoryTable from "@/components/AgentMemoryTable/AgentMemoryTable";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import DeleteAgentMemoryModal from "@/components/DeleteAgentMemoryModal/DeleteAgentMemoryModal";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import UpsertAgentMemoryModal from "@/components/UpsertAgentMemoryModal/UpsertAgentMemoryModal";
import { Permissions } from "@/constants/permissions";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const AgentMemoriesPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(
		() => `${T()("routes.agent.memories")} · ${T()("routes.agent.title")}`,
	);
	//* retain modal content during the closing animation
	const [selected, setSelected] = createSignal<AgentMemory>();
	const [upsertOpen, setUpsertOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const memories = api.agent.useGetMemories();

	// ----------------------------------------
	// Memos
	const data = createMemo(() => memories.data?.data);
	const canManageShared = createMemo(
		() => userStore.get.hasPermission([Permissions.AiMemoriesManage]).all,
	);
	const scopes = createMemo(() => {
		const current = data();
		const scopes: AgentMemoryScope[] = [];
		if (current?.personal.enabled) scopes.push("personal");
		if (current?.shared.enabled && canManageShared()) scopes.push("shared");
		return scopes;
	});
	const createActions = createMemo<CreateMenuAction[]>(() =>
		scopes().length
			? [
					{
						type: "button",
						label: T()("agent.memory.create"),
						onClick: () => openUpsert(undefined),
					},
				]
			: [],
	);
	const sections = createMemo(() => {
		const current = data();
		if (!current) return [];
		return (["personal", "shared"] as const)
			.filter((scope) => current[scope].enabled)
			.map((scope) => ({
				scope,
				list: current[scope],
				editable: scope === "personal" || canManageShared(),
			}));
	});

	// ----------------------------------------
	// Functions
	const openUpsert = (memory: AgentMemory | undefined) => {
		setSelected(memory);
		setUpsertOpen(true);
	};
	const openDelete = (memory: AgentMemory) => {
		setSelected(memory);
		setDeleteOpen(true);
	};
	const count = (list: AgentMemoryList) =>
		T()("agent.memories.count", {
			count: list.memories.length,
			limit: list.limit,
		});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.agent.memories")}
				description={T()("routes.agent.memories.description")}
				actions={<CreateMenu actions={createActions()} />}
			/>
			<PageLayout.Body>
				<QueryBoundary
					loading={memories.isLoading}
					error={memories.isError}
					empty={sections().length === 0}
					loadingFallback={
						<div aria-busy="true" class="flex w-full flex-col gap-8 self-start">
							<For each={[0, 1]}>
								{() => (
									<div>
										<span class="skeleton mb-2 block h-5 w-40" />
										<span class="skeleton mb-4 block h-5 w-80 max-w-full" />
										<span class="skeleton block h-28 w-full" />
									</div>
								)}
							</For>
						</div>
					}
					emptyFallback={
						<p class="text-sm text-muted">{T()("agent.memories.disabled")}</p>
					}
					class="flex-1 h-full p-4 md:p-6"
				>
					<div class="flex min-w-0 flex-col gap-8">
						<For each={sections()}>
							{(section) => (
								<section>
									<SectionHeading
										title={T()(`agent.memories.${section.scope}.title`)}
										description={T()(
											`agent.memories.${section.scope}.description`,
										)}
										actions={
											<span class="flex h-full items-end whitespace-nowrap text-xs text-muted">
												{count(section.list)}
											</span>
										}
									/>
									<Show
										when={section.list.memories.length > 0}
										fallback={
											<p class="rounded-lg border border-dashed border-border px-4 py-16 text-center text-sm text-muted">
												{T()(`agent.memories.${section.scope}.empty`)}
											</p>
										}
									>
										<AgentMemoryTable
											id={`agent.memories.${section.scope}`}
											memories={section.list.memories}
											editable={section.editable}
											loading={memories.isFetching}
											onEdit={openUpsert}
											onDelete={openDelete}
										/>
									</Show>
								</section>
							)}
						</For>
					</div>
				</QueryBoundary>
			</PageLayout.Body>
			<UpsertAgentMemoryModal
				memory={selected}
				scopes={scopes()}
				contentChars={data()?.contentChars ?? 0}
				state={{ open: upsertOpen(), setOpen: setUpsertOpen }}
			/>
			<DeleteAgentMemoryModal
				id={() => selected()?.id}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
			/>
		</PageLayout.Root>
	);
};

export default AgentMemoriesPage;
