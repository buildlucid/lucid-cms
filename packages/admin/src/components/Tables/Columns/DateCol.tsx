import type { Component } from "solid-js";
import Table from "@/components/Groups/Table";
import DateText from "@/components/Partials/DateText";

interface DateColProps {
	date?: string | null;
	options?: {
		include?: boolean;
	};
}

const DateCol: Component<DateColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Td
			options={{
				include: props?.options?.include,
			}}
		>
			<DateText date={props.date} />
		</Table.Td>
	);
};

export default DateCol;
