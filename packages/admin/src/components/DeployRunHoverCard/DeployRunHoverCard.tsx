import { HoverCard } from "@kobalte/core";
import type { DeployRun, DeployRunSource } from "@types";
import type { IconTypes } from "solid-icons";
import {
	TbOutlineBolt,
	TbOutlineClock,
	TbOutlineCode,
	TbOutlineExternalLink,
	TbOutlineRobot,
	TbOutlineUser,
} from "solid-icons/tb";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import Link from "@/components/Link/Link";
import UserDisplay, {
	userAvatarClasses,
} from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import {
	deployRunTones,
	deployToneText,
	getDeployRunDuration,
	getDeployRunSourceLabel,
	getDeployRunStatusLabel,
} from "@/utils/deploys";
import formatDuration from "@/utils/format-duration";

const sourceIcons = {
	trigger: TbOutlineBolt,
	schedule: TbOutlineClock,
	toolkit: TbOutlineCode,
	manual: TbOutlineUser,
	agent: TbOutlineRobot,
} satisfies Record<DeployRunSource, IconTypes>;

/** Shows run status, source, time and host link on hover. Matches the `ActorDisplay` popover. */
const DeployRunHoverCard: Component<{
	run: DeployRun;
	class?: string;
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const duration = createMemo(() =>
		formatDuration(getDeployRunDuration(props.run)),
	);

	// ----------------------------------------
	// Render
	return (
		<HoverCard.Root openDelay={200} closeDelay={150} gutter={6}>
			<HoverCard.Trigger as="span" class={props.class}>
				{props.children}
			</HoverCard.Trigger>
			<HoverCard.Portal>
				<HoverCard.Content class="z-60 w-max max-w-72 rounded-md border border-border bg-popover px-2.5 py-2 shadow-md animate-dropdown">
					<div class="flex items-center gap-2.5">
						<Show
							//* agent runs show the agent, which acted for the person
							when={props.run.source !== "agent" && props.run.startedBy}
							fallback={
								<span
									class={userAvatarClasses({
										variant: "icon",
										size: "sm",
										bordered: true,
									})}
								>
									<Dynamic
										component={sourceIcons[props.run.source]}
										class="h-3/5 w-3/5"
									/>
								</span>
							}
						>
							{(user) => <UserDisplay user={user()} variant="icon" size="sm" />}
						</Show>
						<div class="min-w-0">
							<p class="flex items-baseline gap-1.5 truncate text-sm leading-5 font-medium">
								<span class={deployToneText[deployRunTones[props.run.status]]}>
									{getDeployRunStatusLabel(props.run.status)}
								</span>
								<Show when={duration()}>
									<span class="text-xs font-normal tabular-nums text-muted">
										{duration()}
									</span>
								</Show>
							</p>
							<p class="truncate text-xs leading-4 text-body">
								{getDeployRunSourceLabel(props.run)}
							</p>
							<p class="truncate text-xs leading-4 tabular-nums text-muted">
								{dateHelpers.formatDate(
									props.run.finishedAt ??
										props.run.startedAt ??
										props.run.createdAt,
									{ includeTime: true },
								)}
							</p>
						</div>
						<Show when={props.run.url}>
							{(url) => (
								<Link
									href={url()}
									target="_blank"
									rel="noreferrer"
									variant="ghost"
									size="xs"
									shape="square"
									class="ms-1 shrink-0 self-start"
									aria-label={T()("deploys.view.run")}
									title={T()("deploys.view.run")}
								>
									<TbOutlineExternalLink size={14} />
								</Link>
							)}
						</Show>
					</div>
				</HoverCard.Content>
			</HoverCard.Portal>
		</HoverCard.Root>
	);
};

export default DeployRunHoverCard;
