import { Tooltip } from "@kobalte/core";
import type { AgentCapabilities } from "@types";
import classnames from "classnames";
import { TbOutlineEye, TbOutlineEyeOff, TbOutlineWorld } from "solid-icons/tb";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import T from "@/translations";
import {
	describeReadableMedia,
	readableMimeTypes,
} from "@/utils/agent-references";

const CapabilityHint: Component<{
	active: boolean;
	title: string;
	description: string;
	icon: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Tooltip.Root openDelay={300} placement="top">
			<Tooltip.Trigger
				as="span"
				tabIndex={0}
				class={classnames(
					"flex size-7 cursor-help items-center justify-center rounded-md transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
					props.active
						? "text-subtitle hover:text-title"
						: "text-muted opacity-50",
				)}
				aria-label={`${props.title}. ${props.description}`}
			>
				{props.icon}
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-60 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 shadow-md animate-dropdown">
					<p class="text-pretty text-xs font-medium text-title">
						{props.title}
					</p>
					<p class="mt-0.5 text-pretty text-xs text-body">
						{props.description}
					</p>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};

/**
 * What the agent can do beyond the CMS: open attached files and use the web.
 * Custom tools light these up through their `capabilities`.
 */
const AgentCapabilityHints: Component<{ capabilities?: AgentCapabilities }> = (
	props,
) => {
	// ----------------------------------------
	// Memos
	const mimeTypes = createMemo(() =>
		props.capabilities ? readableMimeTypes(props.capabilities) : [],
	);
	const web = createMemo(() => {
		const capabilities = props.capabilities;
		if (capabilities?.webSearch && capabilities.webRead) {
			return T()("agent.capabilities.web.both");
		}
		if (capabilities?.webSearch) return T()("agent.capabilities.web.search");
		if (capabilities?.webRead) return T()("agent.capabilities.web.read");
		return undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={props.capabilities}>
			<div class="flex items-center">
				<CapabilityHint
					active={mimeTypes().length > 0}
					icon={
						<Show
							when={mimeTypes().length > 0}
							fallback={<TbOutlineEyeOff size={11} />}
						>
							<TbOutlineEye size={11} />
						</Show>
					}
					title={T()(
						mimeTypes().length
							? "agent.capabilities.media"
							: "agent.capabilities.media.none",
					)}
					description={
						mimeTypes().length
							? T()("agent.capabilities.media.description", {
									kinds: describeReadableMedia(mimeTypes()),
								})
							: T()("agent.capabilities.media.none.description")
					}
				/>
				<CapabilityHint
					active={web() !== undefined}
					icon={<TbOutlineWorld size={11} />}
					title={web() ?? T()("agent.capabilities.web.none")}
					description={T()(
						web() === undefined
							? "agent.capabilities.web.none.description"
							: "agent.capabilities.web.description",
					)}
				/>
			</div>
		</Show>
	);
};

export default AgentCapabilityHints;
