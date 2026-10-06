import { useLocation } from "@solidjs/router";
import {
	FaSolidBarsProgress,
	FaSolidBox,
	FaSolidBoxesStacked,
	FaSolidChartSimple,
	FaSolidClockRotateLeft,
	FaSolidCloudArrowUp,
	FaSolidComments,
	FaSolidDesktop,
	FaSolidEnvelope,
	FaSolidGear,
	FaSolidHouse,
	FaSolidMoneyCheck,
	FaSolidPhotoFilm,
	FaSolidPuzzlePiece,
	FaSolidRepeat,
	FaSolidRightFromBracket,
	FaSolidSquareArrowUpRight,
	FaSolidUserLock,
	FaSolidUsers,
	FaSolidWandMagicSparkles,
} from "solid-icons/fa";
import { type Component, createEffect, createMemo, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { AdminNavigationIcon } from "@/extensions/types/navigation";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";

const icons = {
	dashboard: FaSolidHouse,
	agent: FaSolidWandMagicSparkles,
	chat: FaSolidComments,
	history: FaSolidClockRotateLeft,
	routines: FaSolidRepeat,
	"collection-multiple": FaSolidBoxesStacked,
	"collection-single": FaSolidBox,
	media: FaSolidPhotoFilm,
	users: FaSolidUsers,
	overview: FaSolidMoneyCheck,
	usage: FaSolidChartSimple,
	roles: FaSolidUserLock,
	email: FaSolidEnvelope,
	logout: FaSolidRightFromBracket,
	queue: FaSolidBarsProgress,
	integrations: FaSolidDesktop,
	settings: FaSolidGear,
	requests: FaSolidSquareArrowUpRight,
	publishing: FaSolidCloudArrowUp,
	extensions: FaSolidPuzzlePiece,
} satisfies Record<AdminNavigationIcon, typeof FaSolidHouse>;

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
					class="h-8 w-full min-w-0 text-title flex items-center gap-2 px-2 rounded-md bg-sidebar fill-title hover:bg-background-hover transition-colors duration-200 ease-in-out outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				>
					<Dynamic
						component={icons[props.icon]}
						class="size-3.5 shrink-0 text-current"
					/>
					<span class="min-w-0 truncate text-sm font-medium">
						{props.title}
					</span>
				</a>
			</li>
		</Show>
	);
};
