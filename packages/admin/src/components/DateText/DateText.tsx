import classNames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import dateHelpers from "@/utils/date-helpers";

export interface DateTextProps {
	/** An ISO date string. Empty values show a dash. */
	date?: string | null;
	includeTime?: boolean;
	/** Treats the value as a calendar date, without converting timezones. */
	dateOnly?: boolean;
	/** Shows how long ago it was, such as "6 minutes ago", and keeps it current. */
	relative?: boolean;
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
	// State & Hooks
	const [now, setNow] = createSignal(Date.now());

	// ----------------------------------------
	// Memos
	const date = createMemo(() => {
		if (!props.date) return null;
		if (props.relative)
			return dateHelpers.formatRelativeDate(props.date, now());
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
	// Effects
	onMount(() => {
		if (!props.relative) return;
		const interval = setInterval(() => setNow(Date.now()), 60_000);
		onCleanup(() => clearInterval(interval));
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
