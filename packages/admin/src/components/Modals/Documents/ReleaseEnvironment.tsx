import type { DocumentVersionType } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import { Select } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import T from "@/translations";
import {
	getDefaultTimezone,
	getScheduledAt,
	type ReleaseTiming,
} from "@/utils/release-schedule";
import ReleaseScheduleFields from "./ReleaseScheduleFields";

const ReleaseEnvironment: Component<{
	target: Accessor<Exclude<DocumentVersionType, "revision"> | null>;
	environmentLabel: Accessor<string>;
	scheduling: Accessor<boolean>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (
			target: Exclude<DocumentVersionType, "revision">,
			scheduledAt?: string,
			scheduledTimezone?: string,
		) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	// ---------------------------------
	// State & Hooks
	const [releaseTiming, setReleaseTiming] = createSignal<ReleaseTiming>("now");
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ---------------------------------
	// Memos
	const error = createMemo(() => validationError() || props.error);
	const scheduleSelected = createMemo(
		() => props.scheduling() && releaseTiming() === "scheduled",
	);
	const releaseTimingOptions = createMemo(() => [
		{
			value: "now",
			label: T()("release_environment_publish_confirm"),
		},
		{
			value: "scheduled",
			label: T()("schedule_release"),
		},
	]);

	// ---------------------------------
	// Functions
	const updateReleaseTiming = (value: ReleaseTiming) => {
		setReleaseTiming(value);
		setValidationError(undefined);
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setReleaseTiming("now");
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
		setValidationError(undefined);
	});

	// ---------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: props.loading,
				isError: !!error(),
			}}
			copy={{
				title: T()("release_environment_modal_title", {
					environment: props.environmentLabel() ?? "",
				}),
				description: T()("release_environment_modal_description", {
					environment: props.environmentLabel() ?? "",
				}),
				error: error(),
				confirm: scheduleSelected()
					? T()("release_environment_schedule_confirm")
					: T()("release_environment_publish_confirm"),
			}}
			callbacks={{
				onConfirm: async () => {
					const target = props.target();
					if (!target) return console.error("No release target provided");
					if (scheduleSelected()) {
						const scheduledAt = getScheduledAt({
							date: scheduleDate(),
							time: scheduleTime(),
							timezone: scheduleTimezone(),
						});
						if (!scheduledAt) {
							setValidationError(T()("schedule_release_required"));
							return;
						}
						await props.callbacks.onConfirm(
							target,
							scheduledAt,
							scheduleTimezone(),
						);
						return;
					}
					await props.callbacks.onConfirm(target);
				},
				onCancel: props.callbacks.onCancel,
			}}
		>
			<Show when={props.scheduling()}>
				<div class="grid gap-3 pb-4 md:pb-6">
					<Select
						id="release-environment-timing"
						name="release-environment-timing"
						value={releaseTiming()}
						onChange={(value) => {
							if (value === "now" || value === "scheduled") {
								updateReleaseTiming(value);
							}
						}}
						options={releaseTimingOptions()}
						copy={{
							label: T()("release_timing"),
						}}
						noClear={true}
						hideOptionalText={true}
						noMargin={true}
					/>
					<Show when={scheduleSelected()}>
						<div class="mt-1">
							<ReleaseScheduleFields
								date={scheduleDate()}
								setDate={setScheduleDate}
								time={scheduleTime()}
								setTime={setScheduleTime}
								timezone={scheduleTimezone()}
								setTimezone={setScheduleTimezone}
								onChange={() => setValidationError(undefined)}
							/>
						</div>
					</Show>
				</div>
			</Show>
		</Confirmation>
	);
};

export default ReleaseEnvironment;
