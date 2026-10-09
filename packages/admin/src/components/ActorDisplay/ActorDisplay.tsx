import { HoverCard } from "@kobalte/core";
import type { AgentActor } from "@types";
import classNames from "classnames";
import { TbOutlineExternalLink, TbOutlineRobot } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import Link from "@/components/Link/Link";
import UserDisplay, {
	type UserDisplaySize,
	type UserDisplayUser,
	type UserDisplayVariant,
	type UserNameFormat,
	userAvatarClasses,
} from "@/components/UserDisplay/UserDisplay";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

export interface ActorDisplayProps {
	user: (UserDisplayUser & { id?: number }) | null | undefined;
	/** The agent that acted for the user, or for the system when there is no user. */
	agent?: AgentActor | null;
	/** @default "horizontal" */
	variant?: "icon" | "horizontal";
	/** @default "xs" */
	size?: "xs" | "sm" | "md";
	/** Used for people in the `horizontal` variant. @default "name" */
	nameFormat?: UserNameFormat;
	class?: string;
}

/**
 * Shows who acted, with agent details and a chat link when the viewer owns the conversation.
 *
 * @example
 * ```tsx
 * import { ActorDisplay } from "@lucidcms/admin/components";
 *
 * return <ActorDisplay user={comment.user} agent={comment.agent} />;
 * ```
 */
const ActorDisplay: Component<ActorDisplayProps> = (props) => {
	// ----------------------------------------
	// Memos
	const variant = createMemo(() => props.variant ?? "horizontal");
	const size = createMemo(() => props.size ?? "xs");
	const chatHref = createMemo(() => {
		const conversationId = props.agent?.conversationId;
		const viewer = userStore.get.user?.id;
		return conversationId && viewer !== undefined && props.user?.id === viewer
			? `/lucid/agent/chats/${conversationId}`
			: undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.agent}
			fallback={
				<UserDisplay
					user={props.user ?? {}}
					variant={variant()}
					size={size()}
					nameFormat={props.nameFormat ?? "name"}
					class={props.class}
				/>
			}
		>
			{(agent) => (
				<HoverCard.Root openDelay={300} closeDelay={150} gutter={6}>
					<HoverCard.Trigger
						as="span"
						data-actor-display
						class={classNames("flex items-center", props.class)}
					>
						<AgentAvatar variant={variant()} size={size()} />
						<Show when={variant() === "horizontal"}>
							<span class="text-sm">{agent().name}</span>
						</Show>
					</HoverCard.Trigger>
					<HoverCard.Portal>
						<HoverCard.Content class="z-60 w-max max-w-72 rounded-md border border-border bg-popover px-2.5 py-2 shadow-md animate-dropdown">
							<div class="flex items-center gap-2.5">
								<AgentAvatar variant="icon" size="sm" />
								<div class="min-w-0">
									<p class="truncate text-sm leading-5 font-medium text-title">
										{agent().name}
									</p>
									<p class="truncate text-xs leading-4 text-body">
										{props.user
											? T()("agent.actor.for.person", {
													user: helpers.formatUserName(props.user, "name"),
												})
											: agent().system
												? T()("agent.actor.system")
												: T()("agent.actor.for.deleted")}
									</p>
								</div>
								<Show when={chatHref()}>
									{(href) => (
										<Link
											href={href()}
											variant="ghost"
											size="xs"
											shape="square"
											class="ms-1 shrink-0"
											aria-label={T()("agent.actor.open.chat")}
											title={T()("agent.actor.open.chat")}
										>
											<TbOutlineExternalLink size={14} />
										</Link>
									)}
								</Show>
							</div>
						</HoverCard.Content>
					</HoverCard.Portal>
				</HoverCard.Root>
			)}
		</Show>
	);
};

/** The robot avatar standing in for a profile picture. */
const AgentAvatar: Component<{
	variant: UserDisplayVariant;
	size: UserDisplaySize;
}> = (props) => (
	<span
		class={userAvatarClasses({
			variant: props.variant,
			size: props.size,
			bordered: true,
		})}
	>
		<TbOutlineRobot class="h-3/5 w-3/5" />
	</span>
);

export default ActorDisplay;
