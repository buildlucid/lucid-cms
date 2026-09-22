import type { UserLogin } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";

interface UserLoginRowProps {
	index: number;
	login: UserLogin;
}

const UserLoginTableRow: Component<UserLoginRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Row index={props.index}>
			<Table.Text column="authMethod" text={props.login.authMethod} />
			<Table.Text column="ipAddress" text={props.login.ipAddress || "-"} />
			<Table.Text
				column="userAgent"
				text={props.login.userAgent || "-"}
				maxLines={2}
			/>
			<Table.Date column="createdAt" date={props.login.createdAt} />
		</Table.Row>
	);
};

export default UserLoginTableRow;
