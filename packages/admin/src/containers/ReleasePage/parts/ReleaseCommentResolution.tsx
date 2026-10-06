import type { Release, ReleaseCommentResolution, ReleaseEvent } from "@types";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import Menu from "@/components/Menu/Menu";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

type ResolutionOption = ReleaseCommentResolution | "open";

const resolutionStates: Record<
	ResolutionOption,
	{ label: () => string; indicator: StatusIndicatorVariant }
> = {
	open: {
		label: () => T()("releases.comment.resolution.open"),
		indicator: "warning-subtle",
	},
	resolved: {
		label: () => T()("releases.comment.resolution.resolved"),
		indicator: "success-subtle",
	},
	closed: {
		label: () => T()("releases.comment.resolution.closed"),
		indicator: "neutral-subtle",
	},
};

/**
 * Whether a comment thread is open, resolved or closed, shown as a pill at
 * the end of the first comment's header with who changed it on hover. Open comments
 * stop the release being approved. The author and anyone who can edit or
 * approve the release can change it while the release is open.
 */
export const ReleaseCommentResolutionSelect: Component<{
	release: Release;
	comment: Extract<ReleaseEvent, { type: "comment" }>;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const update = api.releases.useUpdateCommentResolution();

	// ----------------------------------------
	// Memos
	const current = createMemo<ResolutionOption>(
		() => props.comment.resolution ?? "open",
	);
	const editable = createMemo(
		() =>
			props.release.status === "open" &&
			(props.comment.user?.id === userStore.get.user?.id ||
				props.release.permissions.edit ||
				props.release.permissions.approve),
	);
	const resolvedBy = createMemo(() =>
		props.comment.resolvedBy
			? T()("releases.comment.resolution.by", {
					name:
						helpers.formatUserName(props.comment.resolvedBy, "name") ||
						T()("common.unknown"),
				})
			: undefined,
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={editable()}
			fallback={
				<span
					class="flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 text-xs text-body"
					title={resolvedBy()}
				>
					<StatusIndicator variant={resolutionStates[current()].indicator} />
					{resolutionStates[current()].label()}
				</span>
			}
		>
			<Menu.Root placement="bottom-end">
				<Menu.Trigger
					class="flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 text-xs text-body transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60"
					disabled={update.action.isPending}
					aria-label={T()("releases.comment.resolution")}
					title={resolvedBy()}
				>
					<StatusIndicator variant={resolutionStates[current()].indicator} />
					{resolutionStates[current()].label()}
					<FaSolidChevronDown size={8} class="text-icon" />
				</Menu.Trigger>
				<Menu.Content>
					<For each={Object.keys(resolutionStates) as ResolutionOption[]}>
						{(option) => (
							<Menu.Item
								selected={option === current()}
								onSelect={() => {
									if (option === current()) return;
									update.action.mutate({
										id: props.release.id,
										eventId: props.comment.id,
										body: { resolution: option === "open" ? null : option },
									});
								}}
							>
								<span class="flex items-center gap-2 whitespace-nowrap">
									<StatusIndicator
										variant={resolutionStates[option].indicator}
									/>
									{resolutionStates[option].label()}
								</span>
							</Menu.Item>
						)}
					</For>
				</Menu.Content>
			</Menu.Root>
		</Show>
	);
};
