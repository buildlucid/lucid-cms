import { Popover } from "@kobalte/core";
import { A, useLocation } from "@solidjs/router";
import classnames from "classnames";
import { FaSolidBell, FaSolidCheckDouble, FaSolidGear } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import ArchiveNotificationModal from "@/components/ArchiveNotificationModal/ArchiveNotificationModal";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import NotificationRow from "@/components/NotificationRow/NotificationRow";
import SkeletonListItems from "@/components/SkeletonListItems/SkeletonListItems";
import ViewAllLink from "@/components/ViewAllLink/ViewAllLink";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";
import { getNotificationsListKey } from "@/utils/notifications";

export interface NotificationBellProps {
	/** @default "sm" */
	size?: "sm" | "md";
}

const NotificationBell: Component<NotificationBellProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const [open, setOpen] = createSignal(false);
	const rowTarget = useRowTarget({ triggers: { archive: false } });

	// ----------------------------------------
	// Queries & Mutations
	const summary = api.notifications.useGetSummary();
	const notifications = api.notifications.useGetMultiple({
		queryParams: {
			filters: { status: () => "inbox" },
			perPage: 8,
		},
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => open() && summary.data !== undefined,
	});
	const update = api.notifications.useUpdateMultiple();
	const markAllRead = api.notifications.useUpdateMultiple();

	// ----------------------------------------
	// Memos
	const unread = createMemo(() => summary.data?.data.unread ?? 0);
	const label = createMemo(() =>
		unread() > 0
			? T()("notifications.bell.unread", { count: unread() })
			: T()("notifications.title"),
	);
	const loading = createMemo(
		() => summary.isLoading || notifications.isLoading,
	);
	const error = createMemo(() => summary.isError || notifications.isError);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		location.pathname;
		setOpen(false);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Popover.Root
				open={open()}
				onOpenChange={setOpen}
				placement="bottom-end"
				gutter={8}
			>
				<Popover.Trigger
					class={classnames(
						"relative flex shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:bg-background-hover hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary data-expanded:bg-background-hover data-expanded:text-icon-hover",
						props.size === "md" ? "size-9" : "size-8",
					)}
					aria-label={label()}
					title={label()}
				>
					<FaSolidBell class="size-3.5" />
					<Show when={unread() > 0}>
						<span class="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none tabular-nums text-primary-foreground ring-2 ring-sidebar">
							{unread() > 99 ? "99+" : unread()}
						</span>
					</Show>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						class="z-60 flex w-88 max-w-[calc(100vw-2rem)] flex-col rounded-md border border-border bg-popover shadow-md animate-dropdown focus:outline-hidden"
						onOpenAutoFocus={(event) => event.preventDefault()}
					>
						<div class="max-h-96 overflow-y-auto scrollbar p-1">
							<Switch
								fallback={
									<ul class="flex flex-col">
										<For each={notifications.data?.data}>
											{(notification) => (
												<NotificationRow
													notification={notification}
													surface="popover"
													onUpdate={update.action.mutate}
													onArchive={(id) => {
														setOpen(false);
														rowTarget.setTargetId(id);
														rowTarget.setTrigger("archive", true);
													}}
													onNavigate={() => setOpen(false)}
												/>
											)}
										</For>
									</ul>
								}
							>
								<Match when={loading()}>
									<ul>
										<SkeletonListItems />
									</ul>
								</Match>
								<Match when={error()}>
									<p class="px-3 py-8 text-center text-sm text-muted">
										{T()("notifications.error")}
									</p>
								</Match>
								<Match when={(notifications.data?.data.length ?? 0) === 0}>
									<p class="px-3 py-8 text-center text-sm text-muted">
										{T()("notifications.empty.title")}
									</p>
								</Match>
							</Switch>
						</div>
						<footer class="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
							<ViewAllLink
								href="/lucid/notifications"
								label={T()("notifications.view.all")}
							/>
							<div class="flex items-center gap-0.5">
								<Show when={unread() > 0}>
									<Button
										size="xs"
										shape="square"
										variant="ghost"
										loading={markAllRead.action.isPending}
										onClick={() =>
											markAllRead.action.mutate({ all: true, read: true })
										}
										aria-label={T()("notifications.mark.all.read")}
										title={T()("notifications.mark.all.read")}
									>
										<FaSolidCheckDouble class="size-3" />
									</Button>
								</Show>
								<A
									href="/lucid/account"
									class={getButtonClasses({
										variant: "ghost",
										size: "xs",
										shape: "square",
									})}
									aria-label={T()("notifications.preferences.link")}
									title={T()("notifications.preferences.link")}
								>
									<FaSolidGear class="size-3" />
								</A>
							</div>
						</footer>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
			<ArchiveNotificationModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().archive,
					setOpen: (state) => rowTarget.setTrigger("archive", state),
				}}
			/>
		</>
	);
};

export default NotificationBell;
