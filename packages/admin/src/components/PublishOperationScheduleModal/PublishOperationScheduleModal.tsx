import type { PublishOperation } from "@types";
import type { Accessor, Component } from "solid-js";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Modal } from "@/components/Modal/Modal";
import ReleaseScheduleFields from "@/components/ReleaseScheduleFields/ReleaseScheduleFields";
import api from "@/services/api";
import T from "@/translations";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";

const PublishOperationScheduleModal: Component<{
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
			setValidationError(T()("documents.release.schedule.validation.required"));
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
		<Modal.Root
			role="alertdialog"
			open={props.state.open}
			onOpenChange={(open) => (open ? props.state.setOpen(true) : close())}
		>
			<Modal.Header>
				<Modal.Title>
					{operationHasSchedule()
						? T()("common.reschedule.release")
						: T()("documents.release.schedule.action")}
				</Modal.Title>
				<Modal.Description>
					{T()("modals.common.schedule.release.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<div class="grid gap-3">
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
			</Modal.Body>
			<Modal.Footer>
				<ErrorMessage theme="basic" message={error()} />
				<Modal.Actions>
					<Button
						variant="outline"
						size="md"
						disabled={reschedule.action.isPending}
						onClick={close}
					>
						{T()("common.cancel")}
					</Button>
					<Show when={operationHasSchedule()}>
						<Button
							variant="danger-outline"
							size="md"
							loading={reschedule.action.isPending}
							onClick={removeSchedule}
						>
							{T()("documents.release.schedule.remove")}
						</Button>
					</Show>
					<Button
						variant="primary"
						size="md"
						loading={reschedule.action.isPending}
						onClick={saveSchedule}
					>
						{operationHasSchedule()
							? T()("actions.update.schedule")
							: T()("documents.release.schedule.action")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default PublishOperationScheduleModal;
