import type { RequestDetail } from "@types";
import { type Component, createEffect, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import RequestScheduleFields from "@/components/RequestScheduleFields/RequestScheduleFields";
import api from "@/services/api";
import T from "@/translations";
import {
	getDefaultTimezone,
	getScheduledAt,
	getScheduleFields,
} from "@/utils/request-schedule";

/** Sets or removes the time an approved request goes live. */
const RequestScheduleModal: Component<{
	open: boolean;
	setOpen: (_open: boolean) => void;
	request: RequestDetail;
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [date, setDate] = createSignal("");
	const [time, setTime] = createSignal("");
	const [timezone, setTimezone] = createSignal(getDefaultTimezone());
	const [invalid, setInvalid] = createSignal(false);
	const update = api.requests.useUpdateSingle({
		onSuccess: () => props.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		const fields = getScheduleFields(
			props.request.scheduledAt,
			props.request.scheduledTimezone ?? getDefaultTimezone(),
		);
		setDate(fields.date);
		setTime(fields.time);
		setTimezone(fields.timezone);
		setInvalid(false);
		update.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const scheduledAt = getScheduledAt({
						date: date(),
						time: time(),
						timezone: timezone(),
					});
					if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
						setInvalid(true);
						return;
					}
					update.action.mutate({
						id: props.request.id,
						body: { scheduledAt, scheduledTimezone: timezone() },
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("requests.schedule.title")}</Modal.Title>
					<Modal.Description>
						{T()("requests.schedule.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<RequestScheduleFields
						date={date()}
						setDate={setDate}
						time={time()}
						setTime={setTime}
						timezone={timezone()}
						setTimezone={setTimezone}
						onChange={() => setInvalid(false)}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage
						theme="basic"
						message={
							invalid()
								? T()("requests.schedule.future")
								: update.errors()?.message
						}
					/>
					<Modal.Actions>
						<Show when={props.request.scheduledAt}>
							<Button
								variant="danger-ghost"
								loading={update.action.isPending}
								onClick={() =>
									update.action.mutate({
										id: props.request.id,
										body: { scheduledAt: null, scheduledTimezone: null },
									})
								}
							>
								{T()("requests.schedule.remove")}
							</Button>
						</Show>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button type="submit" loading={update.action.isPending}>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default RequestScheduleModal;
