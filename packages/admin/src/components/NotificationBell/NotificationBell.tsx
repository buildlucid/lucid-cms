import { Popover } from "@kobalte/core";
import { A, useLocation } from "@solidjs/router";
import classnames from "classnames";
import {
	TbOutlineBell,
	TbOutlineChecks,
	TbOutlineSettings,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import ArchiveNotificationModal from "@/components/ArchiveNotificationModal/ArchiveNotificationModal";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import NotificationList from "@/components/NotificationList/NotificationList";
import ReadAllNotificationsModal from "@/components/ReadAllNotificationsModal/ReadAllNotificationsModal";
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
	const [readAllOpen, setReadAllOpen] = createSignal(false);
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
					<TbOutlineBell class="size-3.5" />
					<Show when={unread() > 0}>
						<span class="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none tabular-nums text-primary-foreground ring-2 ring-sidebar">
							{unread() > 99 ? "99+" : unread()}
						</span>
					</Show>
				</Popover.Trigger>
				<Popover.Content
					//* capped to the space Kobalte measures, so only the list scrolls and the footer stays in view
					class="z-60 flex w-88 max-w-[calc(100vw-2rem)] max-h-(--kb-popper-content-available-height) flex-col rounded-md border border-border bg-popover shadow-md animate-dropdown focus:outline-hidden"
					onOpenAutoFocus={(event) => event.preventDefault()}
				>
					<div class="max-h-96 min-h-0 overflow-y-auto scrollbar p-1">
						<NotificationList
							notifications={notifications.data?.data}
							loading={loading()}
							error={error()}
							surface="popover"
							onArchive={(id) => {
								setOpen(false);
								rowTarget.setTargetId(id);
								rowTarget.setTrigger("archive", true);
							}}
							onNavigate={() => setOpen(false)}
						/>
					</div>
					<footer class="flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-2">
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
									onClick={() => {
										setOpen(false);
										setReadAllOpen(true);
									}}
									aria-label={T()("notifications.mark.all.read")}
									title={T()("notifications.mark.all.read")}
								>
									<TbOutlineChecks class="size-3" />
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
								<TbOutlineSettings class="size-3" />
							</A>
						</div>
					</footer>
				</Popover.Content>
			</Popover.Root>
			<ArchiveNotificationModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().archive,
					setOpen: (state) => rowTarget.setTrigger("archive", state),
				}}
			/>
			<ReadAllNotificationsModal
				state={{ open: readAllOpen(), setOpen: setReadAllOpen }}
			/>
		</>
	);
};

export default NotificationBell;
