import { useNavigate } from "@solidjs/router";
import type { Notification } from "@types";
import classnames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import NotificationThumb from "@/components/NotificationThumb/NotificationThumb";
import Table from "@/components/Table/Table";
import type { Params as UpdateNotificationsParams } from "@/services/api/notifications/useUpdateMultiple";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getNotificationState,
	isNotificationUnread,
	notificationStates,
} from "@/utils/notifications";

export interface NotificationTableRowProps {
	index: number;
	notification: Notification;
	onUpdate: (
		_params: Pick<UpdateNotificationsParams, "ids" | "read" | "archived">,
	) => void;
	onArchive: (_id: number) => void;
}

const NotificationTableRow: Component<NotificationTableRowProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();

	// ----------------------------------------
	// Memos
	const unread = createMemo(() => isNotificationUnread(props.notification));
	const archived = createMemo(() => props.notification.archivedAt !== null);
	const state = createMemo(
		() => notificationStates[getNotificationState(props.notification)],
	);

	// ----------------------------------------
	// Functions
	const markRead = () => {
		if (unread()) props.onUpdate({ ids: [props.notification.id], read: true });
	};
	const openNotification = () => {
		markRead();
		if (props.notification.href) navigate(props.notification.href);
	};

	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			href={props.notification.href ?? undefined}
			onOpen={markRead}
			onClick={props.notification.href ? undefined : markRead}
			actions={[
				{
					label: T()("common.open"),
					type: "button",
					icon: "eye",
					show: props.notification.href !== null,
					onClick: openNotification,
					sortOrder: 0,
				},
				{
					label: unread()
						? T()("notifications.mark.read")
						: T()("notifications.mark.unread"),
					type: "button",
					icon: unread() ? "check" : "email",
					onClick: () =>
						props.onUpdate({ ids: [props.notification.id], read: unread() }),
					excludeFromRowClick: true,
					sortOrder: 10,
				},
				{
					label: archived()
						? T()("notifications.unarchive")
						: T()("notifications.archive"),
					type: "button",
					icon: archived() ? "restore" : "archive",
					onClick: () =>
						archived()
							? props.onUpdate({
									ids: [props.notification.id],
									archived: false,
								})
							: props.onArchive(props.notification.id),
					excludeFromRowClick: true,
					sortOrder: 20,
				},
			]}
		>
			<Table.Cell column="title" minWidth={320}>
				<div class="flex min-w-0 items-center gap-3">
					<NotificationThumb
						notification={props.notification}
						surface="background"
					/>
					<div class="min-w-0">
						<p
							class={classnames(
								"truncate text-sm",
								unread() ? "font-medium text-title" : "text-subtitle",
							)}
							title={props.notification.title}
						>
							{props.notification.title}
						</p>
						<Show when={props.notification.body}>
							{(body) => (
								<p class="truncate text-xs text-muted" title={body()}>
									{body()}
								</p>
							)}
						</Show>
					</div>
				</div>
			</Table.Cell>
			<Table.Pill
				column="status"
				text={state().label()}
				variant={state().pill}
			/>
			<Table.Text
				column="category"
				text={props.notification.category.label}
				minWidth={140}
				maxLines={1}
			/>
			<Table.Text
				column="actor"
				text={
					props.notification.actor
						? helpers.formatUserName(props.notification.actor, "name")
						: undefined
				}
				minWidth={160}
				maxLines={1}
			/>
			<Table.Date
				column="updatedAt"
				date={props.notification.updatedAt}
				includeTime
			/>
		</Table.Row>
	);
};

export default NotificationTableRow;
