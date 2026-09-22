import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import dateHelpers from "@/utils/date-helpers";

export interface DateTextProps {
	/** An ISO date string. Anything empty renders as a dash. */
	date?: string | null;
	/** Puts the time after the date. @default false */
	includeTime?: boolean;
	/**
	 * Reads the date as written rather than converting it to the reader's
	 * timezone, for dates that have no time of day.
	 * @default false
	 */
	localDateOnly?: boolean;
	/** Puts the time in the hover tooltip's full date. @default true */
	fullWithTime?: boolean;
	class?: string;
}

/**
 * A date formatted for the reader's locale, with the full date on hover. Use
 * Table.Date instead when the date is a cell in a table.
 *
 * @example
 * ```tsx
 * import { DateText } from "@lucidcms/admin/components";
 *
 * return <DateText date={entry.createdAt} includeTime={true} />;
 * ```
 */
const DateText: Component<DateTextProps> = (props) => {
	// ----------------------------------------
	// Memos
	const date = createMemo(() => {
		if (!props.date) return null;
		return dateHelpers.formatDate(props.date, {
			includeTime: props.includeTime,
			localDateOnly: props.localDateOnly,
		});
	});
	const fullDate = createMemo(() => {
		if (!props.date) return undefined;
		return dateHelpers.formatFullDate(props.date, {
			includeTime: props.fullWithTime ?? true,
			localDateOnly: props.localDateOnly,
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
