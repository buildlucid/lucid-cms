import { useLocation } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidBarsProgress,
	FaSolidBox,
	FaSolidBoxesStacked,
	FaSolidCloudArrowUp,
	FaSolidDesktop,
	FaSolidEnvelope,
	FaSolidGear,
	FaSolidHouse,
	FaSolidMoneyCheck,
	FaSolidPhotoFilm,
	FaSolidPuzzlePiece,
	FaSolidRightFromBracket,
	FaSolidSquareArrowUpRight,
	FaSolidUserLock,
	FaSolidUsers,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import type { AdminNavigationIcon } from "@/extensions/types/navigation";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";

const icons = {
	dashboard: FaSolidHouse,
	"collection-multiple": FaSolidBoxesStacked,
	"collection-single": FaSolidBox,
	media: FaSolidPhotoFilm,
	users: FaSolidUsers,
	overview: FaSolidMoneyCheck,
	roles: FaSolidUserLock,
	email: FaSolidEnvelope,
	logout: FaSolidRightFromBracket,
	queue: FaSolidBarsProgress,
	integrations: FaSolidDesktop,
	settings: FaSolidGear,
	"release-requests": FaSolidSquareArrowUpRight,
	publishing: FaSolidCloudArrowUp,
	extensions: FaSolidPuzzlePiece,
} satisfies Record<AdminNavigationIcon, typeof FaSolidHouse>;

interface IconLinkFullProps {
	type: "link" | "button";
	title: string;
	href?: string;
	exact?: boolean;
	icon: AdminNavigationIcon;
	active?: boolean;
	permission?: boolean;
	onClick?: () => void;
	loading?: boolean;
}

export const NavigationLink: Component<IconLinkFullProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const location = useLocation();
	let linkElement: HTMLAnchorElement | undefined;

	// ----------------------------------
	// Memos
	const routeIsActive = createMemo(
		() =>
			props.type === "link" &&
			isNavigationLinkActive(location.pathname, props.href || "/", props.exact),
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const active = props.active || routeIsActive();
		if (!linkElement) return;

		setNavigationLinkActiveState(linkElement, active);
	});

	// ----------------------------------
	// Classes
	const iconClasses = classNames("size-3.5 text-current");

	// ----------------------------------
	// Render
	return (
		<Show when={props.permission !== false}>
			<li class="mb-1 last:mb-0">
				<Switch>
					<Match when={props.type === "link"}>
						<a
							ref={(element) => {
								linkElement = element;
							}}
							title={props.title}
							href={props.href || "/"}
							data-navigation-href={props.href || "/"}
							data-navigation-exact={props.exact ? "true" : undefined}
							data-navigation-force-active={props.active ? "true" : undefined}
							link
							class="h-8 w-full text-title flex items-center gap-2 px-2 rounded-md bg-sidebar fill-title hover:bg-background-hover transition-colors duration-200 ease-in-out"
							classList={{
								"animate-pulse": props.loading,
								"pointer-events-none": props.loading,
							}}
						>
							<Dynamic component={icons[props.icon]} class={iconClasses} />
							<span class="block text-sm font-medium">{props.title}</span>
						</a>
					</Match>
					<Match when={props.type === "button"}>
						<button
							type="button"
							tabIndex={0}
							class={classNames(
								"h-8 w-full text-title flex items-center gap-2 px-2 rounded-md bg-sidebar fill-title hover:bg-background-hover transition-colors duration-200 ease-in-out",
								{
									"bg-secondary text-secondary-foreground fill-secondary-foreground":
										props.active,
									"animate-pulse pointer-events-none": props.loading,
								},
							)}
							onClick={props.onClick}
							disabled={props.loading}
						>
							<Dynamic component={icons[props.icon]} class={iconClasses} />
							<span class="block text-sm font-medium">{props.title}</span>
						</button>
					</Match>
				</Switch>
			</li>
		</Show>
	);
};
