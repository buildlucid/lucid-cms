import { type Component, createMemo } from "solid-js";
import dateHelpers from "@/utils/date-helpers";
import classNames from "classnames";

interface DateTextProps {
	date?: string | null;
	class?: string;
}

const DateText: Component<DateTextProps> = (props) => {
	// ----------------------------------
	// Memos
	const date = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatDate(props.date);
	});
	const fullDate = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatFullDate(props.date);
	});

	// ----------------------------------
	// Render
	return (
		<span
			class={classNames("whitespace-nowrap text-sm", props.class)}
			title={fullDate() || ""}
		>
			{date() || "-"}
		</span>
	);
};

export default DateText;
