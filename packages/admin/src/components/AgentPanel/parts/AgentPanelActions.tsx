import {
	TbOutlineArrowsDiagonal,
	TbOutlineDots,
	TbOutlineHistory,
	TbOutlineList,
	TbOutlinePlus,
	TbOutlineX,
} from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Menu from "@/components/Menu/Menu";
import { shortcutText } from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import api from "@/services/api";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import dateHelpers from "@/utils/date-helpers";

const recentChats = 5;
const triggerClasses =
	"flex size-7 items-center justify-center rounded-md text-icon transition-colors hover:bg-background-hover hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary data-expanded:bg-background-hover";

/** The agent panel's header actions: recent chats, a menu with a new chat and the chat's full page, then closing the panel. */
const AgentPanelActions: Component<{
	conversationId?: string;
	onOpen: (conversationId: string | undefined) => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries
	//* only chats with agents offered in the sidebar open here
	const recent = api.agent.useGetConversations({
		queryParams: {
			filters: {
				agentKey: () => getAgentAccess().sidebar.map((agent) => agent.key),
			},
			perPage: recentChats,
		},
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Menu.Root placement="bottom-end">
				<Menu.Trigger
					class={triggerClasses}
					aria-label={T()("agent.panel.recent")}
					title={T()("agent.panel.recent")}
				>
					<TbOutlineHistory size={12} />
				</Menu.Trigger>
				<Menu.Content class="w-72">
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
					<Menu.Separator />
					<Menu.Item
						icon={<TbOutlineList size={12} />}
						href="/lucid/agent/history"
					>
						{T()("agent.panel.recent.all")}
					</Menu.Item>
				</Menu.Content>
			</Menu.Root>
			<Show when={props.conversationId} keyed>
				{(id) => (
					<Menu.Root placement="bottom-end">
						<Menu.Trigger
							class={triggerClasses}
							aria-label={T()("agent.panel.menu")}
							title={T()("agent.panel.menu")}
						>
							<TbOutlineDots size={12} />
						</Menu.Trigger>
						<Menu.Content>
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
						</Menu.Content>
					</Menu.Root>
				)}
			</Show>
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
