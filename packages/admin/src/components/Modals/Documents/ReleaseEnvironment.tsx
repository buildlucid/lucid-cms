import type { DocumentVersionType } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import T from "@/translations";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
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
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ---------------------------------
	// Memos
	const error = createMemo(() => validationError() || props.error);

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setScheduleEnabled(false);
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
				confirm:
					scheduleEnabled() && props.scheduling()
						? T()("release_environment_schedule_confirm")
						: T()("release_environment_publish_confirm"),
			}}
			callbacks={{
				onConfirm: async () => {
					const target = props.target();
					if (!target) return console.error("No release target provided");
					if (scheduleEnabled() && props.scheduling()) {
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
				<div class="pb-4">
					<ReleaseScheduleFields
						enabled={scheduleEnabled()}
						setEnabled={setScheduleEnabled}
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
		</Confirmation>
	);
};

export default ReleaseEnvironment;
