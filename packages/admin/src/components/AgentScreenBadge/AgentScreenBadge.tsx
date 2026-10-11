import { Tooltip } from "@kobalte/core";
import type { Agent, AgentScreen } from "@types";
import classnames from "classnames";
import type { IconTypes } from "solid-icons";
import {
	TbOutlineCloudUpload,
	TbOutlineFileText,
	TbOutlineGitPullRequest,
	TbOutlineHistory,
	TbOutlinePackages,
	TbOutlinePhotoVideo,
} from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import T from "@/translations";

//* list screens share their navigation link's icon
const icons = {
	document: TbOutlineFileText,
	request: TbOutlineGitPullRequest,
	documents: TbOutlinePackages,
	media: TbOutlinePhotoVideo,
	requests: TbOutlineGitPullRequest,
	review: TbOutlineCloudUpload,
	history: TbOutlineHistory,
} satisfies Record<AgentScreen["type"], IconTypes>;

/** Shows a message's admin screen as a composer pill or sent-message icon, with a tooltip explaining the agent's access. */
const AgentScreenBadge: Component<{
	screen: AgentScreen;
	variant: "pill" | "icon";
	/** The agent's builder tools, which decide what the pill says it can do with a document. */
	builder?: Agent["features"]["builder"];
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		T()(
			props.variant === "pill"
				? "agent.screen.label"
				: "agent.screen.sent.from",
			{ name: props.screen.label },
		),
	);
	//* sent messages only say where the person was, as the agent's tools may have changed since
	const hint = createMemo(() => {
		const isDocument = props.screen.type === "document";
		if (props.variant === "icon") {
			return T()(
				isDocument
					? "agent.screen.sent.hint.document"
					: "agent.screen.sent.hint",
			);
		}
		if (!isDocument || !props.builder?.read) {
			return T()("agent.screen.hint");
		}
		return T()(
			props.builder.edit
				? "agent.screen.hint.document.edit"
				: "agent.screen.hint.document",
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Tooltip.Root openDelay={300} placement="top">
			<Tooltip.Trigger
				as="span"
				tabIndex={0}
				aria-label={label()}
				class={classnames(
					"focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
					props.variant === "pill"
						? "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-input px-2.5 py-0.5 text-xs text-subtitle"
						: "flex size-6 items-center justify-center rounded-md transition-colors hover:bg-card hover:text-body",
					props.class,
				)}
			>
				<Dynamic
					component={icons[props.screen.type]}
					size={props.variant === "pill" ? 12 : 11}
					class="shrink-0"
					aria-hidden="true"
				/>
				<Show when={props.variant === "pill"}>
					<span class="truncate">{label()}</span>
				</Show>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-60 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 shadow-md animate-dropdown">
					<p class="text-pretty text-xs font-medium text-title">{label()}</p>
					<p class="mt-0.5 text-pretty text-xs text-body">{hint()}</p>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};

export default AgentScreenBadge;
