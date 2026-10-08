import { useLocation } from "@solidjs/router";
import type { IconTypes } from "solid-icons";
import {
	TbOutlineBell,
	TbOutlineBox,
	TbOutlineChartBar,
	TbOutlineCloudUpload,
	TbOutlineDeviceDesktop,
	TbOutlineExternalLink,
	TbOutlineHistory,
	TbOutlineHome,
	TbOutlineLogout,
	TbOutlineMail,
	TbOutlineMessages,
	TbOutlinePackages,
	TbOutlinePhotoVideo,
	TbOutlineProgress,
	TbOutlinePuzzle,
	TbOutlineRepeat,
	TbOutlineReportMoney,
	TbOutlineSettings,
	TbOutlineUserShield,
	TbOutlineUsers,
	TbOutlineWand,
} from "solid-icons/tb";
import { type Component, createEffect, createMemo, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { AdminNavigationIcon } from "@/extensions/types/navigation";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";

const icons = {
	dashboard: TbOutlineHome,
	agent: TbOutlineWand,
	chat: TbOutlineMessages,
	history: TbOutlineHistory,
	routines: TbOutlineRepeat,
	"collection-multiple": TbOutlinePackages,
	"collection-single": TbOutlineBox,
	media: TbOutlinePhotoVideo,
	users: TbOutlineUsers,
	overview: TbOutlineReportMoney,
	usage: TbOutlineChartBar,
	roles: TbOutlineUserShield,
	email: TbOutlineMail,
	logout: TbOutlineLogout,
	queue: TbOutlineProgress,
	integrations: TbOutlineDeviceDesktop,
	settings: TbOutlineSettings,
	requests: TbOutlineExternalLink,
	publishing: TbOutlineCloudUpload,
	extensions: TbOutlinePuzzle,
	notifications: TbOutlineBell,
} satisfies Record<AdminNavigationIcon, IconTypes>;

/** A sidebar link rendered as a list item. Hidden when `permission` is false. */
export const NavigationLink: Component<{
	title: string;
	href: string;
	exact?: boolean;
	icon: AdminNavigationIcon;
	/** Forces the active state for links that own routes outside their href. */
	active?: boolean;
	permission?: boolean;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const location = useLocation();
	let linkElement: HTMLAnchorElement | undefined;

	// ----------------------------------
	// Memos
	const routeIsActive = createMemo(() =>
		isNavigationLinkActive(location.pathname, props.href, props.exact),
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const active = props.active || routeIsActive();
		if (!linkElement) return;

		setNavigationLinkActiveState(linkElement, active);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props.permission !== false}>
			<li class="mb-0.5 last:mb-0">
				<a
					ref={(element) => {
						linkElement = element;
					}}
					title={props.title}
					href={props.href}
					data-navigation-href={props.href}
					data-navigation-exact={props.exact ? "true" : undefined}
					data-navigation-force-active={props.active ? "true" : undefined}
					link
					class="group h-8 w-full min-w-0 text-body hover:text-title flex items-center gap-2 px-2 rounded-md bg-sidebar hover:bg-background-hover transition-colors duration-200 ease-in-out outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				>
					<Dynamic
						component={icons[props.icon]}
						class="size-3.5 shrink-0 text-muted transition-colors duration-200 group-hover:text-subtitle group-aria-[current=page]:text-current"
					/>
					<span class="min-w-0 truncate text-sm font-medium">
						{props.title}
					</span>
				</a>
			</li>
		</Show>
	);
};
