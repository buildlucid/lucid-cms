import { type Component, Switch, Match, Show } from "solid-js";
import helpers from "@/utils/helpers";
import classNames from "classnames";

interface UserDisplayProps {
	user: {
		username?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		thumbnail?: string;
	};
	mode: "short" | "long" | "icon";
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
					"rounded-full flex bg-primary-base text-primary-contrast justify-center items-center text-xs font-bold",
					{
						"h-10 w-10 min-w-10": props.mode === "icon",
						"h-8 w-8 min-w-8": props.mode === "long",
						"h-8 w-8 min-w-8 mr-2.5": props.mode === "short",
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
