import type { Component } from "solid-js";
import DateText from "@/components/DateText/DateText";
import { TableCell } from "@/components/TableCell/TableCell";

interface DateColProps {
	date?: string | null;
	includeTime?: boolean;
	localDateOnly?: boolean;
	fullWithTime?: boolean;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const TableDateCell: Component<DateColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
			}}
		>
			<DateText
				date={props.date}
				includeTime={props.includeTime}
				localDateOnly={props.localDateOnly}
				fullWithTime={props.fullWithTime}
			/>
		</TableCell>
	);
};

export default TableDateCell;
