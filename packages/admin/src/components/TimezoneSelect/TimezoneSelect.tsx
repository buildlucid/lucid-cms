import { type Component, createMemo, createSignal } from "solid-js";
import Select from "@/components/Select/Select";
import T from "@/translations";
import {
	getDefaultTimezone,
	getSupportedTimezones,
} from "@/utils/release-schedule";

/** A searchable select of IANA timezones. */
const TimezoneSelect: Component<{
	id: string;
	value: string;
	onChange: (_timezone: string) => void;
	label?: string;
}> = (props) => {
	// ----------------------------------------
	// State
	const [search, setSearch] = createSignal("");

	// ----------------------------------------
	// Memos
	const options = createMemo(() => {
		const query = search().trim().toLowerCase();
		return Array.from(
			new Set([props.value, getDefaultTimezone(), ...getSupportedTimezones()]),
		)
			.filter(
				(timezone) => timezone !== "" && timezone.toLowerCase().includes(query),
			)
			.map((timezone) => ({ value: timezone, label: timezone }));
	});

	// ----------------------------------------
	// Render
	return (
		<Select
			id={props.id}
			name={props.id}
			value={props.value}
			onChange={(value) => {
				if (value !== undefined) props.onChange(value);
			}}
			options={options()}
			search={{ value: search(), onChange: setSearch }}
			required={true}
			label={props.label ?? T()("common.timezone")}
		/>
	);
};

export default TimezoneSelect;
