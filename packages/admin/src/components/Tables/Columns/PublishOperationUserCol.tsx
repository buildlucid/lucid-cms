import type { PublishOperationUser } from "@types";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";

const PublishOperationUserCol: Component<{
	user: PublishOperationUser;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
			}}
		>
			{props.user ? (
				<UserDisplay
					user={{
						username:
							props.user.username ??
							props.user.email ??
							T()("media.types.unknown"),
						firstName: props.user.firstName,
						lastName: props.user.lastName,
						profilePicture: props.user.profilePicture,
					}}
					mode="short"
					size="x-small"
					nameFormat="simple"
				/>
			) : (
				"-"
			)}
		</Td>
	);
};

export default PublishOperationUserCol;
