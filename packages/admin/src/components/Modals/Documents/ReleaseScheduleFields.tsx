import { type Component, createMemo, createSignal } from "solid-js";
import { Checkbox, Input, Select } from "@/components/Groups/Form";
import T from "@/translations";
import {
	getDefaultTimezone,
	getSupportedTimezones,
} from "@/utils/release-schedule";

const ReleaseScheduleFields: Component<{
	enabled: boolean;
	setEnabled: (_enabled: boolean) => void;
	date: string;
	setDate: (_date: string) => void;
	time: string;
	setTime: (_time: string) => void;
	timezone: string;
	setTimezone: (_timezone: string) => void;
	onChange?: () => void;
}> = (props) => {
	// ----------------------------------
	// State
	const [timezoneSearch, setTimezoneSearch] = createSignal("");

	// ----------------------------------
	// Memos
	const timezoneOptions = createMemo(() => {
		const search = timezoneSearch().trim().toLowerCase();
		const values = Array.from(
			new Set([
				props.timezone,
				getDefaultTimezone(),
				...getSupportedTimezones(),
			]),
		).filter(Boolean);

		return values
			.filter((timezone) => timezone.toLowerCase().includes(search))
			.map((timezone) => ({
				value: timezone,
				label: timezone,
			}));
	});

	return (
		<div class="flex flex-col gap-3 rounded-md border border-border bg-card-base p-3">
			<Checkbox
				id="release-schedule-enabled"
				name="release-schedule-enabled"
				value={props.enabled}
				onChange={(value) => {
					props.setEnabled(value);
					props.onChange?.();
				}}
				copy={{
					label: T()("schedule_release"),
				}}
				noMargin={true}
			/>
			<div class="grid gap-3 md:grid-cols-[1fr_0.75fr_1.25fr]">
				<Input
					id="release-schedule-date"
					name="release-schedule-date"
					type="date"
					value={props.date}
					onChange={(value) => {
						props.setDate(value);
						props.onChange?.();
					}}
					disabled={!props.enabled}
					required={props.enabled}
					copy={{
						label: T()("date"),
					}}
					noMargin={true}
				/>
				<Input
					id="release-schedule-time"
					name="release-schedule-time"
					type="time"
					value={props.time}
					onChange={(value) => {
						props.setTime(value);
						props.onChange?.();
					}}
					disabled={!props.enabled}
					required={props.enabled}
					copy={{
						label: T()("time"),
					}}
					noMargin={true}
				/>
				<Select
					id="release-schedule-timezone"
					name="release-schedule-timezone"
					value={props.timezone}
					onChange={(value) => {
						if (typeof value === "string") props.setTimezone(value);
						props.onChange?.();
					}}
					options={timezoneOptions()}
					search={{
						value: timezoneSearch(),
						onChange: setTimezoneSearch,
						isLoading: false,
					}}
					disabled={!props.enabled}
					required={props.enabled}
					copy={{
						label: T()("timezone"),
						searchPlaceholder: T()("search"),
					}}
					noClear={true}
					noMargin={true}
				/>
			</div>
		</div>
	);
};

export default ReleaseScheduleFields;
