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
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";

interface IconLinkFullProps {
	type: "link" | "button";
	title: string;
	href?: string;
	exact?: boolean;
	icon:
		| "dashboard"
		| "collection-multiple"
		| "collection-single"
		| "media"
		| "users"
		| "overview"
		| "roles"
		| "email"
		| "logout"
		| "queue"
		| "integrations"
		| "settings"
		| "release-requests"
		| "publishing";
	active?: boolean;
	permission?: boolean;
	onClick?: () => void;
	loading?: boolean;
}

export const IconLinkFull: Component<IconLinkFullProps> = (props) => {
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

	const Icons: Component = () => {
		return (
			<Switch>
				<Match when={props.icon === "dashboard"}>
					<FaSolidHouse class={iconClasses} />
				</Match>
				<Match when={props.icon === "collection-multiple"}>
					<FaSolidBoxesStacked class={iconClasses} />
				</Match>
				<Match when={props.icon === "collection-single"}>
					<FaSolidBox class={iconClasses} />
				</Match>
				<Match when={props.icon === "media"}>
					<FaSolidPhotoFilm class={iconClasses} />
				</Match>
				<Match when={props.icon === "users"}>
					<FaSolidUsers class={iconClasses} />
				</Match>
				<Match when={props.icon === "overview"}>
					<FaSolidMoneyCheck class={iconClasses} />
				</Match>
				<Match when={props.icon === "roles"}>
					<FaSolidUserLock class={iconClasses} />
				</Match>
				<Match when={props.icon === "email"}>
					<FaSolidEnvelope class={iconClasses} />
				</Match>
				<Match when={props.icon === "logout"}>
					<FaSolidRightFromBracket class={iconClasses} />
				</Match>
				<Match when={props.icon === "queue"}>
					<FaSolidBarsProgress class={iconClasses} />
				</Match>
				<Match when={props.icon === "integrations"}>
					<FaSolidDesktop class={iconClasses} />
				</Match>
				<Match when={props.icon === "settings"}>
					<FaSolidGear class={iconClasses} />
				</Match>
				<Match when={props.icon === "release-requests"}>
					<FaSolidSquareArrowUpRight class={iconClasses} />
				</Match>
				<Match when={props.icon === "publishing"}>
					<FaSolidCloudArrowUp class={iconClasses} />
				</Match>
			</Switch>
		);
	};

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
							class="h-8 w-full text-title flex items-center gap-2 px-2 rounded-md bg-sidebar-base fill-title hover:bg-navigation-hover transition-colors duration-200 ease-in-out"
							classList={{
								"animate-pulse": props.loading,
								"pointer-events-none": props.loading,
							}}
						>
							<Icons />
							<span class="block text-sm font-medium">{props.title}</span>
						</a>
					</Match>
					<Match when={props.type === "button"}>
						<button
							type="button"
							tabIndex={0}
							class={classNames(
								"h-8 w-full text-title flex items-center gap-2 px-2 rounded-md bg-sidebar-base fill-title hover:bg-navigation-hover transition-colors duration-200 ease-in-out",
								{
									"bg-navigation-active text-secondary-contrast fill-secondary-contrast":
										props.active,
									"animate-pulse pointer-events-none": props.loading,
								},
							)}
							onClick={props.onClick}
							disabled={props.loading}
						>
							<Icons />
							<span class="block text-sm font-medium">{props.title}</span>
						</button>
					</Match>
				</Switch>
			</li>
		</Show>
	);
};
