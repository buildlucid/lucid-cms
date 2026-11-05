import { formatForDisplay } from "@tanstack/solid-hotkeys";
import {
	TbOutlineArrowsDiagonal,
	TbOutlineDots,
	TbOutlineHistory,
	TbOutlineList,
	TbOutlinePin,
	TbOutlinePlus,
	TbOutlineX,
} from "solid-icons/tb";
import { type Component, For, Match, Show, Switch } from "solid-js";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import Menu from "@/components/Menu/Menu";
import api from "@/services/api";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import dateHelpers from "@/utils/date-helpers";
import { shortcuts } from "@/utils/shortcuts";

const recentChats = 5;
const triggerClasses = getButtonClasses({
	variant: "toolbar",
	size: "xs",
	shape: "square",
});

/** The agent panel's header actions: recent chats, a menu with a new chat and the chat's full page, keeping a peeking panel open, then closing it. */
const AgentPanelActions: Component<{
	conversationId?: string;
	onOpen: (conversationId: string | undefined) => void;
	/** Keeps a panel peeking in from the edge open beside the content. */
	onPin?: () => void;
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
								<Switch fallback={T()("agent.panel.recent.empty")}>
									<Match when={recent.isLoading}>{T()("common.loading")}</Match>
									<Match when={recent.isError}>
										{T()("agent.panel.recent.error")}
									</Match>
								</Switch>
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
						href="/admin/agent/history"
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
								href={`/admin/agent/chats/${id}`}
							>
								{T()("agent.panel.expand")}
							</Menu.Item>
						</Menu.Content>
					</Menu.Root>
				)}
			</Show>
			<Show when={props.onPin}>
				{(pin) => (
					<Button
						size="xs"
						shape="square"
						variant="toolbar"
						aria-label={T()("agent.panel.pin")}
						title={`${T()("agent.panel.pin")} (${formatForDisplay(shortcuts.toggleAgentPanel.hotkey)})`}
						onClick={() => pin()()}
					>
						<TbOutlinePin size={12} />
					</Button>
				)}
			</Show>
			<Button
				size="xs"
				shape="square"
				variant="toolbar"
				aria-label={T()("agent.panel.close")}
				//* while peeking, the shortcut keeps it open rather than closing it
				title={
					props.onPin
						? T()("agent.panel.close")
						: `${T()("agent.panel.close")} (${formatForDisplay(shortcuts.toggleAgentPanel.hotkey)})`
				}
				onClick={() => props.onClose()}
			>
				<TbOutlineX size={12} />
			</Button>
		</>
	);
};

export default AgentPanelActions;
