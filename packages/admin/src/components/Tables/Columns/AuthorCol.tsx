import { type Component, Switch, Match } from "solid-js";
import type { UserRef } from "@types";
import { Td } from "@/components/Groups/Table";
import UserDisplay from "@/components/Partials/UserDisplay";

interface AuthorColProps {
	user: UserRef;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const AuthorCol: Component<AuthorColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
			}}
		>
			<Switch>
				<Match when={!props.user || !props.user.username}>-</Match>
				<Match when={props.user}>
					<UserDisplay
						user={{
							username: props.user?.username || "",
							firstName: props.user?.firstName,
							lastName: props.user?.lastName,
							thumbnail: undefined,
						}}
						mode="short"
					/>
				</Match>
			</Switch>
		</Td>
	);
};

export default AuthorCol;
