import type { Notification } from "@types";
import { type Component, createMemo, For, Match, Switch } from "solid-js";
import NotificationRow from "@/components/NotificationRow/NotificationRow";
import SkeletonListItems from "@/components/SkeletonListItems/SkeletonListItems";
import api from "@/services/api";
import T from "@/translations";

/** Notification rows with their loading, error and empty states, for the bell and the Home widget. */
const NotificationList: Component<{
	notifications: Notification[] | undefined;
	loading: boolean;
	error: boolean;
	/** @default "card" */
	surface?: "card" | "popover";
	onArchive: (_id: number) => void;
	onNavigate?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const update = api.notifications.useUpdateMultiple();

	// ----------------------------------------
	// Memos
	const messageClass = createMemo(() =>
		props.surface === "popover"
			? "px-3 py-8 text-center text-sm text-muted"
			: "flex min-h-9 items-center px-2 text-sm text-muted",
	);

	// ----------------------------------------
	// Render
	return (
		<Switch
			fallback={
				<ul class="flex flex-col">
					<For each={props.notifications}>
						{(notification) => (
							<NotificationRow
								notification={notification}
								surface={props.surface}
								onUpdate={update.action.mutate}
								onArchive={props.onArchive}
								onNavigate={props.onNavigate}
							/>
						)}
					</For>
				</ul>
			}
		>
			<Match when={props.loading}>
				<ul class="flex flex-col">
					<SkeletonListItems />
				</ul>
			</Match>
			<Match when={props.error}>
				<p class={messageClass()}>{T()("notifications.error")}</p>
			</Match>
			<Match when={(props.notifications?.length ?? 0) === 0}>
				<p class={messageClass()}>{T()("notifications.empty.title")}</p>
			</Match>
		</Switch>
	);
};

export default NotificationList;
