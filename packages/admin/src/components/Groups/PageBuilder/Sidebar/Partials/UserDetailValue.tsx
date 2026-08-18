import type { InternalCollectionDocument } from "@types";
import { type Component, Show } from "solid-js";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";

const UserDetailValue: Component<{
	user: InternalCollectionDocument["createdBy"];
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Show when={props.user} fallback="-">
			{(user) => (
				<UserDisplay
					user={{
						username:
							user().username ?? user().email ?? T()("media.types.unknown"),
						firstName: user().firstName,
						lastName: user().lastName,
						profilePicture: user().profilePicture,
					}}
					mode="short"
					size="x-small"
					nameFormat="simple"
				/>
			)}
		</Show>
	);
};

export default UserDetailValue;
