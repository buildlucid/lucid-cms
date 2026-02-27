import classNames from "classnames";
import { type Component, Match, Show, Switch } from "solid-js";
import helpers from "@/utils/helpers";

interface UserDisplayProps {
	user: {
		username?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		thumbnail?: string;
	};
	mode: "short" | "long" | "icon";
	size?: "small" | "medium";
}

const UserDisplay: Component<UserDisplayProps> = (props) => {
	// ----------------------------------
	// Render

	if (!props.user.username) {
		return null;
	}

	return (
		<div
			class={classNames("flex items-center", {
				"w-full": props.mode === "long",
			})}
		>
			<span
				class={classNames(
					"rounded-full flex bg-primary-muted-bg text-primary-base border border-primary-muted-border justify-center items-center font-bold",
					{
						"h-10 w-10 min-w-10 text-[10px]":
							props.mode === "icon" && props.size !== "small",
						"h-7 w-7 min-w-7 text-[8px]":
							(props.mode === "icon" && props.size === "small") ||
							props.mode === "long",
						"h-8 w-8 min-w-8 mr-2.5 text-[10px]": props.mode === "short",
					},
				)}
			>
				{helpers.formatUserInitials({
					firstName: props.user.firstName,
					lastName: props.user.lastName,
					username: props.user.username,
				})}
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
