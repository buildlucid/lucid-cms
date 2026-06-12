import type { ProfilePicture } from "@types";
import classNames from "classnames";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import helpers from "@/utils/helpers";

interface UserDisplayProps {
	user: {
		username?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		profilePicture?: ProfilePicture | null;
	};
	mode: "short" | "long" | "icon";
	size?: "x-small" | "small" | "medium" | "large";
	nameFormat?: "username" | "username-only" | "simple";
}

const UserDisplay: Component<UserDisplayProps> = (props) => {
	// ----------------------------------
	// Memos
	const hasProfilePicture = createMemo(() => !!props.user.profilePicture?.url);

	if (!props.user.username) {
		return null;
	}

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames("flex items-center", {
				"w-full": props.mode === "long",
			})}
		>
			<span
				class={classNames(
					"rounded-full flex bg-input-base text-title justify-center items-center font-bold overflow-hidden",
					{
						"border border-border": !hasProfilePicture(),
						"h-16 w-16 min-w-16 text-sm":
							props.mode === "icon" && props.size === "large",
						"h-10 w-10 min-w-10 text-[10px]":
							props.mode === "icon" &&
							props.size !== "x-small" &&
							props.size !== "small" &&
							props.size !== "large",
						"h-5 w-5 min-w-5 text-[7px]":
							props.mode === "icon" && props.size === "x-small",
						"h-7 w-7 min-w-7 text-[8px]":
							(props.mode === "icon" && props.size === "small") ||
							props.mode === "long",
						"h-5 w-5 min-w-5 mr-2 text-[7px]":
							props.mode === "short" && props.size === "x-small",
						"h-7 w-7 min-w-7 mr-2 text-[8px]":
							props.mode === "short" && props.size === "small",
						"h-8 w-8 min-w-8 mr-2.5 text-[10px]":
							props.mode === "short" &&
							props.size !== "x-small" &&
							props.size !== "small",
					},
				)}
			>
				<Show
					when={props.user.profilePicture?.url}
					fallback={helpers.formatUserInitials({
						firstName: props.user.firstName,
						lastName: props.user.lastName,
						username: props.user.username,
					})}
				>
					{(url) => (
						<img
							src={`${url()}?preset=thumbnail-small&format=webp`}
							alt=""
							class="h-full w-full rounded-full object-cover"
							loading="lazy"
						/>
					)}
				</Show>
			</span>
			<Switch>
				<Match when={props.mode === "short"}>
					<span class="text-sm">
						{helpers.formatUserName(props.user, props.nameFormat)}
					</span>
				</Match>
				<Match when={props.mode === "long"}>
					<div class="flex flex-col ml-2">
						<p class="text-sm text-title">{props.user.username}</p>
						<Show when={props.user.firstName}>
							<p class="text-xs">
								{props.user.firstName} {props.user.lastName}
							</p>
						</Show>
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default UserDisplay;
