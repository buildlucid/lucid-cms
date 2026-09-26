import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import Input from "@/components/Input/Input";
import Select from "@/components/Select/Select";
import TimezoneSelect from "@/components/TimezoneSelect/TimezoneSelect";
import T from "@/translations";
import {
	describeSchedule,
	type Schedule,
	type SchedulePreset,
	toCron,
	weekdayName,
} from "@/utils/agent-schedule";

/** Picks when a routine runs, from simple presets or a cron expression. */
const AgentScheduleField: Component<{
	schedule: Schedule;
	setSchedule: (_schedule: Schedule) => void;
	timezone: string;
	setTimezone: (_timezone: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const presets = createMemo(() =>
		(
			["hourly", "daily", "weekdays", "weekly", "custom"] as SchedulePreset[]
		).map((value) => ({
			value,
			label: T()(`agent.schedule.preset.${value}`),
		})),
	);
	const days = createMemo(() =>
		[1, 2, 3, 4, 5, 6, 0].map((value) => ({
			value,
			label: weekdayName(value),
		})),
	);

	// ----------------------------------------
	// Functions
	const update = (changes: Partial<Schedule>) =>
		props.setSchedule({ ...props.schedule, ...changes });

	// ----------------------------------------
	// Render
	return (
		<fieldset class="flex flex-col gap-3">
			<div class="grid gap-3 md:grid-cols-2">
				<Select
					id="agent-routine-repeat"
					name="repeat"
					value={props.schedule.preset}
					onChange={(value) => {
						if (!value) return;
						//* carry the current schedule into the custom expression
						update({ preset: value, cron: toCron(props.schedule) });
					}}
					options={presets()}
					label={T()("agent.schedule.repeat")}
				/>
				<Switch>
					<Match when={props.schedule.preset === "hourly"}>
						<Input
							id="agent-routine-minute"
							name="minute"
							type="number"
							min={0}
							max={59}
							value={String(props.schedule.minute)}
							onChange={(value) => update({ minute: Number(value) || 0 })}
							label={T()("agent.schedule.minute")}
						/>
					</Match>
					<Match when={props.schedule.preset === "custom"}>
						<Input
							id="agent-routine-cron"
							name="cron"
							type="text"
							value={props.schedule.cron}
							onChange={(cron) => update({ cron })}
							label={T()("agent.schedule.cron")}
							description={T()("agent.schedule.cron.description")}
						/>
					</Match>
					<Match when={true}>
						<Input
							id="agent-routine-time"
							name="time"
							type="time"
							value={props.schedule.time}
							onChange={(time) => update({ time })}
							label={T()("common.time")}
						/>
					</Match>
				</Switch>
				<Show when={props.schedule.preset === "weekly"}>
					<Select
						id="agent-routine-day"
						name="day"
						value={props.schedule.day}
						onChange={(day) => {
							if (day !== undefined) update({ day });
						}}
						options={days()}
						label={T()("agent.schedule.day")}
					/>
				</Show>
			</div>
			<TimezoneSelect
				id="agent-routine-timezone"
				value={props.timezone}
				onChange={props.setTimezone}
				description={T()("agent.schedule.summary", {
					schedule: describeSchedule(toCron(props.schedule)),
					timezone: props.timezone,
				})}
			/>
		</fieldset>
	);
};

export default AgentScheduleField;
