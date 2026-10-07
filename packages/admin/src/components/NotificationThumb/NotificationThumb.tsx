import type { Notification } from "@types";
import classnames from "classnames";
import {
	FaSolidBarsProgress,
	FaSolidBell,
	FaSolidGear,
	FaSolidSquareArrowUpRight,
} from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import { notificationLevelIndicators } from "@/utils/notifications";

export interface NotificationThumbProps {
	notification: Notification;
	/** @default "card" */
	surface?: "card" | "popover" | "background";
}

const categoryIcons: Record<string, typeof FaSolidBell> = {
	system: FaSolidGear,
	requests: FaSolidSquareArrowUpRight,
	workflows: FaSolidBarsProgress,
};

const NotificationThumb: Component<NotificationThumbProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span class="relative flex shrink-0" aria-hidden="true">
			<span class="flex h-9 w-7 items-center justify-center rounded border border-border bg-input text-muted shadow-xs">
				<Dynamic
					component={
						categoryIcons[props.notification.category.key] ?? FaSolidBell
					}
					size={10}
				/>
			</span>
			<Show when={props.notification.level !== "info"}>
				<StatusIndicator
					variant={notificationLevelIndicators[props.notification.level]}
					size="xs"
					class={classnames("absolute -right-1 -bottom-0.5 ring-2", {
						"ring-card": !props.surface || props.surface === "card",
						"ring-popover": props.surface === "popover",
						"ring-background": props.surface === "background",
					})}
				/>
			</Show>
		</span>
	);
};

export default NotificationThumb;
