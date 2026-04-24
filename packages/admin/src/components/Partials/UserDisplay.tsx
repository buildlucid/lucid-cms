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
	size?: "small" | "medium" | "large";
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
					"rounded-full flex bg-primary-muted-bg text-primary-base justify-center items-center font-bold overflow-hidden",
					{
						"border border-primary-muted-border": !hasProfilePicture(),
						"h-16 w-16 min-w-16 text-sm":
							props.mode === "icon" && props.size === "large",
						"h-10 w-10 min-w-10 text-[10px]":
							props.mode === "icon" &&
							props.size !== "small" &&
							props.size !== "large",
						"h-7 w-7 min-w-7 text-[8px]":
							(props.mode === "icon" && props.size === "small") ||
							props.mode === "long",
						"h-8 w-8 min-w-8 mr-2.5 text-[10px]": props.mode === "short",
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
							src={`${url()}?preset=thumbnail&format=webp`}
							alt=""
							class="h-full w-full rounded-full object-cover"
						/>
					)}
				</Show>
			</span>
			<Switch>
				<Match when={props.mode === "short"}>{props.user.username}</Match>
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
