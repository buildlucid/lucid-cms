import type { PublishOperation } from "@types";
import type { Accessor, Component } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import api from "@/services/api";
import T from "@/translations";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
import ReleaseScheduleFields from "./ReleaseScheduleFields";

const PublishOperationSchedule: Component<{
	operation: Accessor<PublishOperation | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
		onClose?: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Queries & Mutations
	const reschedule = api.publishOperations.useReschedule({
		onSuccess: () => {
			props.state.setOpen(false);
			resetState();
			props.callbacks?.onSuccess?.();
		},
	});

	// ----------------------------------
	// Memos
	const operationHasSchedule = createMemo(() =>
		Boolean(props.operation()?.scheduledAt),
	);
	const error = createMemo(
		() => validationError() || reschedule.errors()?.message,
	);

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const resetState = () => {
		resetSchedule();
		setValidationError(undefined);
		reschedule.reset();
	};
	const prefillSchedule = () => {
		const operation = props.operation();
		if (operation?.scheduledAt) {
			const scheduledAt = new Date(operation.scheduledAt);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};
	const close = () => {
		props.state.setOpen(false);
		resetState();
		props.callbacks?.onClose?.();
	};
	const saveSchedule = async () => {
		const operation = props.operation();
		if (!operation) return;

		const scheduledAt = getScheduledAt({
			date: scheduleDate(),
			time: scheduleTime(),
			timezone: scheduleTimezone(),
		});
		if (!scheduledAt) {
			setValidationError(T()("schedule_release_required"));
			return;
		}

		await reschedule.action.mutateAsync({
			id: operation.id,
			body: {
				scheduledAt,
				scheduledTimezone: scheduleTimezone(),
			},
		});
	};
	const removeSchedule = async () => {
		const operation = props.operation();
		if (!operation) return;

		await reschedule.action.mutateAsync({
			id: operation.id,
			body: {
				scheduledAt: null,
				scheduledTimezone: null,
			},
		});
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setValidationError(undefined);
		prefillSchedule();
	});

	// ----------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: reschedule.action.isPending,
				isError: !!error(),
			}}
			copy={{
				title: operationHasSchedule()
					? T()("reschedule_release")
					: T()("schedule_release"),
				description: T()("schedule_release_modal_description"),
				confirm: T()("update_schedule"),
				error: error(),
			}}
			callbacks={{
				onConfirm: saveSchedule,
				onCancel: close,
			}}
			slots={{
				actions: (
					<>
						<Button
							theme="border-outline"
							size="medium"
							type="button"
							disabled={reschedule.action.isPending}
							onClick={close}
						>
							{T()("cancel")}
						</Button>
						<Show when={operationHasSchedule()}>
							<Button
								theme="danger-outline"
								size="medium"
								type="button"
								loading={reschedule.action.isPending}
								onClick={removeSchedule}
							>
								{T()("remove_schedule")}
							</Button>
						</Show>
						<Button
							theme="primary"
							size="medium"
							type="button"
							loading={reschedule.action.isPending}
							onClick={saveSchedule}
						>
							{operationHasSchedule()
								? T()("update_schedule")
								: T()("schedule_release")}
						</Button>
					</>
				),
			}}
		>
			<div class="grid gap-3 pb-4 md:pb-6">
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
		</Confirmation>
	);
};

export default PublishOperationSchedule;
