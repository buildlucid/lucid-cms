import type { PublishOperationUser } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import UserDisplay from "@/components/UserDisplay/UserDisplay";

const PublishOperationUserCell: Component<{
	column?: string;
	user: PublishOperationUser;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column}>
			{props.user ? (
				<UserDisplay
					user={props.user}
					variant="horizontal"
					size="xs"
					nameFormat="name"
				/>
			) : (
				"-"
			)}
		</Table.Cell>
	);
};

export default PublishOperationUserCell;
