import type { Component } from "solid-js";
import Input from "@/components/Input/Input";
import TimezoneSelect from "@/components/TimezoneSelect/TimezoneSelect";
import T from "@/translations";

const RequestScheduleFields: Component<{
	date: string;
	setDate: (_date: string) => void;
	time: string;
	setTime: (_time: string) => void;
	timezone: string;
	setTimezone: (_timezone: string) => void;
	onChange?: () => void;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div class="grid gap-3 md:grid-cols-[1fr_0.75fr_1.25fr]">
			<Input
				id="request-schedule-date"
				name="request-schedule-date"
				type="date"
				value={props.date}
				onChange={(value) => {
					props.setDate(value);
					props.onChange?.();
				}}
				required={true}
				label={T()("common.date")}
			/>
			<Input
				id="request-schedule-time"
				name="request-schedule-time"
				type="time"
				value={props.time}
				onChange={(value) => {
					props.setTime(value);
					props.onChange?.();
				}}
				required={true}
				label={T()("common.time")}
			/>
			<TimezoneSelect
				id="request-schedule-timezone"
				value={props.timezone}
				onChange={(timezone) => {
					props.setTimezone(timezone);
					props.onChange?.();
				}}
			/>
		</div>
	);
};

export default RequestScheduleFields;
