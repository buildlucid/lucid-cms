import { type Component, createMemo, For, Match, Switch } from "solid-js";
import ArchiveNotificationModal from "@/components/ArchiveNotificationModal/ArchiveNotificationModal";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import NotificationRow from "@/components/NotificationRow/NotificationRow";
import SkeletonListItems from "@/components/SkeletonListItems/SkeletonListItems";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";
import { getNotificationsListKey } from "@/utils/notifications";

const NotificationsWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// State & Hooks
	const rowTarget = useRowTarget({ triggers: { archive: false } });

	// ----------------------------------------
	// Queries & Mutations
	const summary = api.notifications.useGetSummary();
	const attention = api.notifications.useGetMultiple({
		queryParams: { filters: { status: () => "attention" }, perPage: 5 },
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => summary.data !== undefined,
	});
	const unread = api.notifications.useGetMultiple({
		queryParams: { filters: { status: () => "unread" }, perPage: 6 },
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => summary.data !== undefined,
	});
	const update = api.notifications.useUpdateMultiple();

	// ----------------------------------------
	// Memos
	const loading = createMemo(
		() => summary.isLoading || attention.isLoading || unread.isLoading,
	);
	const error = createMemo(
		() => summary.isError || attention.isError || unread.isError,
	);
	const notifications = createMemo(() => {
		const open = attention.data?.data ?? [];
		const seen = new Set(open.map((notification) => notification.id));
		return [
			...open,
			...(unread.data?.data ?? []).filter(
				(notification) => !seen.has(notification.id),
			),
		].slice(0, 6);
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("notifications.title")}
			count={summary.data?.data.unread}
			href="/lucid/notifications"
		>
			<Switch
				fallback={
					<ul class="flex flex-col">
						<For each={notifications()}>
							{(notification) => (
								<NotificationRow
									notification={notification}
									onUpdate={update.action.mutate}
									onArchive={(id) => {
										rowTarget.setTargetId(id);
										rowTarget.setTrigger("archive", true);
									}}
								/>
							)}
						</For>
					</ul>
				}
			>
				<Match when={loading()}>
					<ul class="flex flex-col">
						<SkeletonListItems />
					</ul>
				</Match>
				<Match when={error()}>
					<p class="flex min-h-9 items-center px-2 text-sm text-muted">
						{T()("notifications.error")}
					</p>
				</Match>
				<Match when={notifications().length === 0}>
					<p class="flex min-h-9 items-center px-2 text-sm text-muted">
						{T()("notifications.empty.title")}
					</p>
				</Match>
			</Switch>
			<ArchiveNotificationModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().archive,
					setOpen: (state) => rowTarget.setTrigger("archive", state),
				}}
			/>
		</DashboardCard>
	);
};

export default NotificationsWidget;
