import { debounce } from "@solid-primitives/scheduled";
import { useNavigate } from "@solidjs/router";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import AgentComposer from "@/components/AgentComposer/AgentComposer";
import AgentConversationList from "@/components/AgentConversationList/AgentConversationList";
import AgentHeader from "@/components/AgentHeader/AgentHeader";
import Button from "@/components/Button/Button";
import EmptyState from "@/components/EmptyState/EmptyState";
import Input from "@/components/Input/Input";
import PageLayout from "@/components/PageLayout/PageLayout";
import api from "@/services/api";
import T from "@/translations";

const pageSize = 10;

/** Starts a new chat and lists recent ones, with chats waiting on the user first. */
const AgentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [search, setSearch] = createSignal("");
	const [title, setTitle] = createSignal<string>();
	const [perPage, setPerPage] = createSignal(pageSize);
	const searchTitle = debounce((value: string) => {
		setTitle(value.trim() || undefined);
		setPerPage(pageSize);
	}, 300);

	// ----------------------------------------
	// Queries & Mutations
	const recent = api.agent.useGetConversations({
		queryParams: { filters: { title }, perPage },
	});
	const waiting = api.agent.useGetConversations({
		queryParams: { filters: { status: "waiting" }, perPage: 5 },
	});
	const createConversation = api.agent.useCreateConversation();

	// ----------------------------------------
	// Memos
	const conversations = createMemo(() => recent.data?.data ?? []);
	const hasMore = createMemo(
		() => (recent.data?.meta.total ?? 0) > conversations().length,
	);

	// ----------------------------------------
	// Functions
	const start = async (text: string) => {
		const conversation = await createConversation.action.mutateAsync({});
		navigate(`/lucid/agent/chats/${conversation.data.id}`, {
			state: { message: text },
		});
	};

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<AgentHeader />
			<PageLayout.Body padding="md">
				<div class="mx-auto flex w-full max-w-3xl flex-col gap-12 py-6 md:py-14">
					<section class="flex flex-col items-center gap-6">
						<h2 class="text-center text-2xl font-medium text-title">
							{T()("agent.home.title")}
						</h2>
						<AgentComposer
							size="lg"
							autofocus={true}
							class="w-full"
							placeholder={T()("agent.composer.placeholder")}
							busy={createConversation.action.isPending}
							onSubmit={start}
						/>
					</section>

					<Show when={waiting.data?.data.length}>
						<section class="flex flex-col gap-3">
							<h3 class="text-sm font-medium text-title">
								{T()("agent.home.waiting")}
							</h3>
							<AgentConversationList conversations={waiting.data?.data ?? []} />
						</section>
					</Show>

					<section class="flex flex-col gap-3">
						<div class="flex items-end justify-between gap-4">
							<h3 class="text-sm font-medium text-title">
								{T()("agent.home.recent")}
							</h3>
							<Input
								id="agent-chat-search"
								name="search"
								type="search"
								value={search()}
								onChange={(value) => {
									setSearch(value);
									searchTitle(value);
								}}
								placeholder={T()("agent.home.search")}
								aria-label={T()("agent.home.search")}
								class="w-56"
							/>
						</div>
						<Show
							when={conversations().length}
							fallback={
								<Show when={!recent.isLoading}>
									<EmptyState
										class="rounded-md border border-dashed border-border"
										title={
											title()
												? T()("agent.home.search.empty")
												: T()("agent.home.empty.title")
										}
										description={
											title()
												? T()("agent.home.search.empty.description")
												: T()("agent.home.empty.description")
										}
									/>
								</Show>
							}
						>
							<AgentConversationList conversations={conversations()} />
						</Show>
						<Show when={hasMore()}>
							<Button
								variant="ghost"
								size="sm"
								class="self-center"
								loading={recent.isFetching}
								onClick={() => setPerPage((count) => count + pageSize)}
							>
								{T()("common.show_more")}
							</Button>
						</Show>
					</section>
				</div>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
