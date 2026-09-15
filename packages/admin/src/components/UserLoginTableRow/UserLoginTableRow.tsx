import type { UserLogin } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import type { TableRowProps } from "@/types/components";

interface UserLoginRowProps extends TableRowProps {
	login: UserLogin;
	include: boolean[];
	theme?: TableTheme;
}

const UserLoginTableRow: Component<UserLoginRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			actions={[]}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<TableTextCell
				text={props.login.authMethod}
				options={{
					include: props?.include[0],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.login.ipAddress || "-"}
				options={{
					include: props?.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.login.userAgent || "-"}
				options={{
					include: props?.include[2],
					maxLines: 2,
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={props.login.createdAt}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
		</TableRow>
	);
};

export default UserLoginTableRow;
