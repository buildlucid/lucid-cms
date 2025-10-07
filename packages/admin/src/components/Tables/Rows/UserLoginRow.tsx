import type { Component } from "solid-js";
import type { TableRowProps } from "@/types/components";
import type { UserLoginResponse } from "@types";
import { Tr } from "@/components/Groups/Table";
import type { TableTheme } from "@/components/Groups/Table/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "../Columns/DateCol";

interface UserLoginRowProps extends TableRowProps {
	login: UserLoginResponse;
	include: boolean[];
	theme?: TableTheme;
}

const UserLoginRow: Component<UserLoginRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			actions={[]}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<TextCol
				text={props.login.authMethod}
				options={{
					include: props?.include[0],
					padding: props.options?.padding,
				}}
			/>
			<TextCol
				text={props.login.ipAddress || "-"}
				options={{
					include: props?.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TextCol
				text={props.login.userAgent || "-"}
				options={{
					include: props?.include[2],
					maxLines: 2,
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.login.createdAt}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
		</Tr>
	);
};

export default UserLoginRow;
