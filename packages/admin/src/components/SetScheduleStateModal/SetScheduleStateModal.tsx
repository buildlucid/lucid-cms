import type { JobScheduleSummary } from "@types";
import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={
				isPausing()
					? T()("modals.jobs.schedule.pause.title")
					: T()("modals.jobs.schedule.resume.title")
			}
			description={
				isPausing()
					? T()("modals.jobs.schedule.pause.description")
					: T()("modals.jobs.schedule.resume.description")
			}
			confirmLabel={
				isPausing()
					? T()("modals.jobs.schedule.pause.confirm")
					: T()("modals.jobs.schedule.resume.confirm")
			}
			confirmVariant={isPausing() ? "danger" : "primary"}
			loading={setState.action.isPending}
			error={setState.errors()?.message}
			onConfirm={() => {
				const schedule = props.schedule();
				if (!schedule) return;

				setState.action.mutate(
					{
						scheduleKey: schedule.key,
						state: nextState(),
					},
					{ onSuccess: () => props.state.setOpen(false) },
				);
			}}
			onCancel={() => {
				props.state.setOpen(false);
				setState.reset();
			}}
		/>
	);
};

export default SetScheduleStateModal;
