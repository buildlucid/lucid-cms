import { type Component, Switch, Match } from "solid-js";
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
		<div class="flex items-center">
			<span
				class={classNames(
					" rounded-full flex bg-primary-base text-primary-contrast justify-center items-center text-xs font-bold",
					{
						"h-10 w-10 min-w-10": props.mode === "icon",
						"h-8 w-8 min-w-[32px] mr-2.5": props.mode !== "icon",
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
					{helpers.formatUserName({
						username: props.user.username,
						firstName: props.user.firstName,
						lastName: props.user.lastName,
					})}
				</Match>
			</Switch>
		</div>
	);
};

export default UserDisplay;
