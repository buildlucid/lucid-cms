import { type Component, Switch, Match } from "solid-js";
import type { UserResMeta } from "@lucidcms/core/types";
import Table from "@/components/Groups/Table";
import UserDisplay from "@/components/Partials/UserDisplay";

interface AuthorColProps {
	user: UserResMeta;
	options?: {
		include?: boolean;
	};
}

const AuthorCol: Component<AuthorColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Td
			options={{
				include: props?.options?.include,
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
		</Table.Td>
	);
};

export default AuthorCol;
