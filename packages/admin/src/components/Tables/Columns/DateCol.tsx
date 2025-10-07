import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table";
import DateText from "@/components/Partials/DateText";

interface DateColProps {
	date?: string | null;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const DateCol: Component<DateColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
			}}
		>
			<DateText date={props.date} />
		</Td>
	);
};

export default DateCol;
