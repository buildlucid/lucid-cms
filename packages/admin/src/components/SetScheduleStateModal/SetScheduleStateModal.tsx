import type { JobScheduleSummary } from "@types";
import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import T from "@/translations";

interface SetScheduleStateProps {
	schedule: Accessor<JobScheduleSummary | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const SetScheduleStateModal: Component<SetScheduleStateProps> = (props) => {
	// ----------------------------------
	// Mutations
	const setState = api.jobs.useSetScheduleState();

	// ----------------------------------
	// Memos
	const nextState = () =>
		props.schedule()?.state === "paused" ? "active" : "paused";
	const isPausing = () => nextState() === "paused";

	// ----------------------------------
	// Render
	return (
		<ConfirmationModal
			theme={isPausing() ? "danger" : "primary"}
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: setState.action.isPending,
				isError: setState.action.isError,
			}}
			copy={{
				title: isPausing()
					? T()("modals.jobs.schedule.pause.title")
					: T()("modals.jobs.schedule.resume.title"),
				description: isPausing()
					? T()("modals.jobs.schedule.pause.description")
					: T()("modals.jobs.schedule.resume.description"),
				confirm: isPausing()
					? T()("modals.jobs.schedule.pause.confirm")
					: T()("modals.jobs.schedule.resume.confirm"),
				error: setState.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const schedule = props.schedule();
					if (!schedule) return;

					setState.action.mutate(
						{
							scheduleKey: schedule.key,
							state: nextState(),
						},
						{ onSuccess: () => props.state.setOpen(false) },
					);
				},
				onCancel: () => {
					props.state.setOpen(false);
					setState.reset();
				},
			}}
		/>
	);
};

export default SetScheduleStateModal;
