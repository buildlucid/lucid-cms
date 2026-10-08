import type { Notification } from "@types";
import {
	FaSolidBarsProgress,
	FaSolidBell,
	FaSolidComments,
	FaSolidGear,
	FaSolidSquareArrowUpRight,
} from "solid-icons/fa";
import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface NotificationThumbProps {
	notification: Notification;
}

const categoryIcons: Record<string, typeof FaSolidBell> = {
	system: FaSolidGear,
	requests: FaSolidSquareArrowUpRight,
	workflows: FaSolidBarsProgress,
	agent: FaSolidComments,
};

const NotificationThumb: Component<NotificationThumbProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			class="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-border bg-input text-muted shadow-xs"
			aria-hidden="true"
		>
			<Dynamic
				component={
					categoryIcons[props.notification.category.key] ?? FaSolidBell
				}
				size={10}
			/>
		</span>
	);
};

export default NotificationThumb;
