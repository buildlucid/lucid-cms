import type { InternalCollectionDocument } from "@types";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";

const DocumentAuthorCol: Component<{
	user: InternalCollectionDocument["createdBy"];
	options?: {
		include?: boolean;
		padding?: "16" | "24";
		minWidth?: number;
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: props.options?.minWidth,
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
				<span class="text-sm text-body">{T()("common.none")}</span>
			)}
		</Td>
	);
};

export default DocumentAuthorCol;
