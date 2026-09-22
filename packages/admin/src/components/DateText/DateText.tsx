import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import dateHelpers from "@/utils/date-helpers";

export interface DateTextProps {
	/** An ISO date string. Empty values show a dash. */
	date?: string | null;
	includeTime?: boolean;
	/** Treats the value as a calendar date, without converting timezones. */
	dateOnly?: boolean;
	class?: string;
}

/**
 * A date formatted for the user's locale, with the full date and time on
 * hover.
 *
 * @example
 * ```tsx
 * import { DateText } from "@lucidcms/admin/components";
 *
 * return <DateText date={redirect.updatedAt} includeTime />;
 * ```
 */
const DateText: Component<DateTextProps> = (props) => {
	// ----------------------------------------
	// Memos
	const date = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatDate(props.date, {
			includeTime: props.includeTime,
			localDateOnly: props.dateOnly,
		});
	});
	const fullDate = createMemo(() => {
		if (!props.date) return undefined;
		return dateHelpers.formatFullDate(props.date, {
			includeTime: !props.dateOnly,
			localDateOnly: props.dateOnly,
		});
	});

	// ----------------------------------------
	// Render
	return (
		<span
			data-date-text
			class={classNames("whitespace-nowrap text-sm", props.class)}
			title={fullDate()}
		>
			{date() || "-"}
		</span>
	);
};

export default DateText;
