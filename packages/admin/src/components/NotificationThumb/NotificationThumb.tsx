import type { Notification } from "@types";
import type { IconTypes } from "solid-icons";
import {
	TbOutlineBell,
	TbOutlineExternalLink,
	TbOutlineMessages,
	TbOutlineProgress,
	TbOutlineSettings,
} from "solid-icons/tb";
import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface NotificationThumbProps {
	notification: Notification;
}

const categoryIcons: Record<string, IconTypes> = {
	system: TbOutlineSettings,
	requests: TbOutlineExternalLink,
	workflows: TbOutlineProgress,
	agent: TbOutlineMessages,
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
					categoryIcons[props.notification.category.key] ?? TbOutlineBell
				}
				size={10}
			/>
		</span>
	);
};

export default NotificationThumb;
