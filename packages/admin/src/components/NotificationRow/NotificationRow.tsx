import { A } from "@solidjs/router";
import type { Notification } from "@types";
import classnames from "classnames";
import {
	FaSolidBoxArchive,
	FaSolidEnvelope,
	FaSolidEnvelopeOpen,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import Button from "@/components/Button/Button";
import NotificationThumb from "@/components/NotificationThumb/NotificationThumb";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import type { Params as UpdateNotificationsParams } from "@/services/api/notifications/useUpdateMultiple";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import {
	isNotificationOpen,
	isNotificationUnread,
	notificationStates,
} from "@/utils/notifications";

export interface NotificationRowProps {
	notification: Notification;
	/** @default "card" */
	surface?: "card" | "popover";
	onUpdate: (_params: Pick<UpdateNotificationsParams, "ids" | "read">) => void;
	onArchive: (_id: number) => void;
	onNavigate?: () => void;
}

const NotificationRow: Component<NotificationRowProps> = (props) => {
	// ----------------------------------------
	// Memos
	const unread = createMemo(() => isNotificationUnread(props.notification));
	const open = createMemo(() => isNotificationOpen(props.notification));
	const readLabel = createMemo(() =>
		unread()
			? T()("notifications.mark.read")
			: T()("notifications.mark.unread"),
	);

	// ----------------------------------------
	// Functions
	const openNotification = () => {
		if (unread()) props.onUpdate({ ids: [props.notification.id], read: true });
		props.onNavigate?.();
	};

	// ----------------------------------------
	// Render
	return (
		<li class="group relative flex items-center" data-notification-row>
			<Dynamic
				component={props.notification.href ? A : "button"}
				href={props.notification.href ?? undefined}
				type={props.notification.href ? undefined : "button"}
				onClick={openNotification}
				class="flex min-w-0 grow items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
			>
				<NotificationThumb
					notification={props.notification}
					surface={props.surface}
				/>
				<span class="flex min-w-0 grow flex-col">
					<span class="flex h-5 items-center gap-3">
						<span
							class={classnames(
								"min-w-0 grow truncate text-sm",
								unread() ? "font-medium text-title" : "text-subtitle",
							)}
							title={props.notification.title}
						>
							{props.notification.title}
						</span>
						<span class="flex shrink-0 items-center gap-2 text-[11px] leading-4 text-muted">
							<span class="whitespace-nowrap">
								{dateHelpers.formatRelativeDate(props.notification.updatedAt)}
							</span>
							<Show when={open()}>
								<StatusIndicator
									variant="warning-subtle"
									size="xs"
									label={notificationStates.attention.label()}
								/>
							</Show>
							<Show when={unread()}>
								<span
									class="size-1.5 rounded-full bg-primary"
									role="img"
									aria-label={T()("notifications.unread")}
								/>
							</Show>
						</span>
					</span>
					<Show when={props.notification.body}>
						<span class="truncate text-xs text-muted">
							{props.notification.body}
						</span>
					</Show>
				</span>
			</Dynamic>
			{/* on coarse pointers the actions sit beside the row rather than over it */}
			<div
				class={classnames(
					"flex shrink-0 items-center gap-0.5 pointer-fine:absolute pointer-fine:end-2 pointer-fine:top-1/2 pointer-fine:-translate-y-1/2 pointer-fine:rounded-md pointer-fine:p-0.5 pointer-fine:shadow-xs pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100",
					props.surface === "popover"
						? "pointer-fine:bg-popover"
						: "pointer-fine:bg-card",
				)}
			>
				<Button
					size="xs"
					variant="ghost"
					shape="square"
					aria-label={readLabel()}
					title={readLabel()}
					onClick={() =>
						props.onUpdate({ ids: [props.notification.id], read: unread() })
					}
				>
					<Show when={unread()} fallback={<FaSolidEnvelope class="size-3" />}>
						<FaSolidEnvelopeOpen class="size-3" />
					</Show>
				</Button>
				<Button
					size="xs"
					variant="ghost"
					shape="square"
					aria-label={T()("notifications.archive")}
					title={T()("notifications.archive")}
					onClick={() => props.onArchive(props.notification.id)}
				>
					<FaSolidBoxArchive class="size-3" />
				</Button>
			</div>
		</li>
	);
};

export default NotificationRow;
