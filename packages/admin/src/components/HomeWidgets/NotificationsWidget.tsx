import { type Component, createMemo } from "solid-js";
import ArchiveNotificationModal from "@/components/ArchiveNotificationModal/ArchiveNotificationModal";
import HomeCard from "@/components/HomeCard/HomeCard";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import NotificationList from "@/components/NotificationList/NotificationList";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";
import { getNotificationsListKey } from "@/utils/notifications";

const NotificationsWidget: Component<{ size: HomeWidgetSize }> = () => {
	// ----------------------------------------
	// State & Hooks
	const rowTarget = useRowTarget({ triggers: { archive: false } });

	// ----------------------------------------
	// Queries & Mutations
	const summary = api.notifications.useGetSummary();
	const attention = api.notifications.useGetMultiple({
		queryParams: { filters: { status: () => "actionRequired" }, perPage: 5 },
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => summary.data !== undefined,
	});
	const unread = api.notifications.useGetMultiple({
		queryParams: { filters: { status: () => "unread" }, perPage: 6 },
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => summary.data !== undefined,
	});

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
		<HomeCard
			title={T()("notifications.title")}
			count={summary.data?.data.unread}
			href="/admin/notifications"
		>
			<NotificationList
				notifications={notifications()}
				loading={loading()}
				error={error()}
				onArchive={(id) => {
					rowTarget.setTargetId(id);
					rowTarget.setTrigger("archive", true);
				}}
			/>
			<ArchiveNotificationModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().archive,
					setOpen: (state) => rowTarget.setTrigger("archive", state),
				}}
			/>
		</HomeCard>
	);
};

export default NotificationsWidget;
