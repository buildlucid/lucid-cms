import type {
	RequestCommentResolution,
	RequestDetail,
	RequestEvent,
} from "@types";
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

type ResolutionOption = RequestCommentResolution | "open";

const resolutionStates: Record<
	ResolutionOption,
	{ label: () => string; indicator: StatusIndicatorVariant }
> = {
	open: {
		label: () => T()("requests.comment.resolution.open"),
		indicator: "warning-subtle",
	},
	resolved: {
		label: () => T()("requests.comment.resolution.resolved"),
		indicator: "success-subtle",
	},
	closed: {
		label: () => T()("requests.comment.resolution.closed"),
		indicator: "neutral-subtle",
	},
};

/**
 * Whether a comment thread is open, resolved or closed, shown as a pill at
 * the end of the first comment's header with who changed it on hover. Open comments
 * stop the request being approved. The author and anyone who can edit or
 * approve the request can change it while the request is open.
 */
export const RequestCommentResolutionSelect: Component<{
	request: RequestDetail;
	comment: Extract<RequestEvent, { type: "comment" }>;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const update = api.requests.useUpdateCommentResolution();

	// ----------------------------------------
	// Memos
	const current = createMemo<ResolutionOption>(
		() => props.comment.resolution ?? "open",
	);
	const editable = createMemo(
		() =>
			props.request.status === "open" &&
			(props.comment.user?.id === userStore.get.user?.id ||
				props.request.permissions.edit ||
				props.request.permissions.approve),
	);
	const resolvedBy = createMemo(() =>
		props.comment.resolvedBy
			? T()("requests.comment.resolution.by", {
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
					aria-label={T()("requests.comment.resolution")}
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
										id: props.request.id,
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
