import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import dateHelpers from "@/utils/date-helpers";

interface DateTextProps {
	date?: string | null;
	class?: string;
	includeTime?: boolean;
	localDateOnly?: boolean;
	fullWithTime?: boolean;
}

const DateText: Component<DateTextProps> = (props) => {
	// ----------------------------------
	// Memos
	const date = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatDate(props.date, {
			includeTime: props.includeTime,
			localDateOnly: props.localDateOnly,
		});
	});
	const fullDate = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatFullDate(props.date, {
			includeTime: props.fullWithTime ?? true,
			localDateOnly: props.localDateOnly,
		});
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
