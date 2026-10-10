import {
	TbOutlineArrowsDiagonal,
	TbOutlineDots,
	TbOutlineHistory,
	TbOutlinePlus,
	TbOutlineX,
} from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Menu from "@/components/Menu/Menu";
import { shortcutText } from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const recentChats = 5;

/** The agent panel's header actions: a menu with a new chat, the chat's full page and recent chats, then closing the panel. */
const AgentPanelActions: Component<{
	conversationId?: string;
	onOpen: (conversationId: string | undefined) => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries
	const recent = api.agent.useGetConversations({
		queryParams: { perPage: recentChats },
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Menu.Root placement="bottom-end">
				<Menu.Trigger
					class="flex size-7 items-center justify-center rounded-md text-icon transition-colors hover:bg-background-hover hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary data-expanded:bg-background-hover"
					aria-label={T()("agent.panel.menu")}
					title={T()("agent.panel.menu")}
				>
					<TbOutlineDots size={12} />
				</Menu.Trigger>
				<Menu.Content class="w-72">
					<Show when={props.conversationId} keyed>
						{(id) => (
							<>
								<Menu.Item
									icon={<TbOutlinePlus size={12} />}
									onSelect={() => props.onOpen(undefined)}
								>
									{T()("agent.chat.new")}
								</Menu.Item>
								<Menu.Item
									icon={<TbOutlineArrowsDiagonal size={12} />}
									href={`/lucid/agent/chats/${id}`}
								>
									{T()("agent.panel.expand")}
								</Menu.Item>
								<Menu.Separator />
							</>
						)}
					</Show>
					<Menu.Label>{T()("agent.panel.recent")}</Menu.Label>
					<For
						each={recent.data?.data ?? []}
						fallback={
							<Menu.Item disabled={true}>
								{T()("agent.panel.recent.empty")}
							</Menu.Item>
						}
					>
						{(conversation) => (
							<Menu.Item
								textValue={conversation.title}
								selected={conversation.id === props.conversationId}
								onSelect={() => props.onOpen(conversation.id)}
								end={
									<Show when={conversation.updatedAt}>
										{(updatedAt) => (
											<time
												datetime={updatedAt()}
												class="shrink-0 text-xs text-muted"
											>
												{dateHelpers.formatTimestamp(updatedAt())}
											</time>
										)}
									</Show>
								}
							>
								{conversation.title}
							</Menu.Item>
						)}
					</For>
					<Menu.Item
						icon={<TbOutlineHistory size={12} />}
						href="/lucid/agent/history"
					>
						{T()("agent.panel.recent.all")}
					</Menu.Item>
				</Menu.Content>
			</Menu.Root>
			<Button
				size="xs"
				shape="square"
				variant="ghost"
				aria-label={T()("agent.panel.close")}
				title={`${T()("agent.panel.close")} (${shortcutText.toggleAgentPanel})`}
				onClick={() => props.onClose()}
			>
				<TbOutlineX size={12} />
			</Button>
		</>
	);
};

export default AgentPanelActions;
