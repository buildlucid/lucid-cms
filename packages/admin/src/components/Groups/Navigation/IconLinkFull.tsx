import { type Component, Switch, Match, Show } from "solid-js";
import classNames from "classnames";
import {
	FaSolidPhotoFilm,
	FaSolidUsers,
	FaSolidGear,
	FaSolidHouse,
	FaSolidUserLock,
	FaSolidEnvelope,
	FaSolidBox,
	FaSolidBoxesStacked,
	FaSolidRightFromBracket,
	FaSolidBarsProgress,
	FaSolidDesktop,
	FaSolidKey,
	FaSolidMoneyCheck,
} from "solid-icons/fa";
import { A } from "@solidjs/router";

interface IconLinkFullProps {
	type: "link" | "button";
	title: string;
	href?: string;
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
		| "client-integrations"
		| "license";
	active?: boolean;
	permission?: boolean;
	onClick?: () => void;
	loading?: boolean;
}

export const IconLinkFull: Component<IconLinkFullProps> = (props) => {
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
				<Match when={props.icon === "client-integrations"}>
					<FaSolidDesktop class={iconClasses} />
				</Match>
				<Match when={props.icon === "license"}>
					<FaSolidKey class={iconClasses} />
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
						<A
							title={props.title}
							href={props.href || "/"}
							class={classNames(
								"h-8 w-full text-title flex items-center px-2 rounded-md bg-sidebar-base fill-title hover:bg-card-hover transition-colors duration-200 ease-in-out",
								{
									"bg-secondary-base text-secondary-contrast fill-secondary-base-contrast":
										props.active,
									"animate-pulse pointer-events-none": props.loading,
								},
							)}
							activeClass={classNames(
								"bg-secondary-base! text-secondary-contrast! fill-secondary-base-contrast!",
							)}
							end={props.href === "/admin"}
						>
							<Icons />
							<span class="ml-2 block text-sm font-medium">{props.title}</span>
						</A>
					</Match>
					<Match when={props.type === "button"}>
						<button
							type="button"
							tabIndex={0}
							class={classNames(
								"h-8 w-full text-title flex items-center px-2 rounded-md bg-sidebar-base fill-title hover:bg-card-hover transition-colors duration-200 ease-in-out",
								{
									"bg-secondary-base text-secondary-contrast fill-secondary-base-contrast":
										props.active,
									"animate-pulse pointer-events-none": props.loading,
								},
							)}
							onClick={props.onClick}
							disabled={props.loading}
						>
							<Icons />
							<span class="ml-2 block text-sm font-medium">{props.title}</span>
						</button>
					</Match>
				</Switch>
			</li>
		</Show>
	);
};
