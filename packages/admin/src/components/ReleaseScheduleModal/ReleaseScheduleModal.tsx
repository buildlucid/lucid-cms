import type { Release } from "@types";
import { type Component, createEffect, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import ReleaseScheduleFields from "@/components/ReleaseScheduleFields/ReleaseScheduleFields";
import api from "@/services/api";
import T from "@/translations";
import {
	getDefaultTimezone,
	getScheduledAt,
	getScheduleFields,
} from "@/utils/release-schedule";

/** Sets or removes the time an approved release goes live. */
const ReleaseScheduleModal: Component<{
	open: boolean;
	setOpen: (_open: boolean) => void;
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [date, setDate] = createSignal("");
	const [time, setTime] = createSignal("");
	const [timezone, setTimezone] = createSignal(getDefaultTimezone());
	const [invalid, setInvalid] = createSignal(false);
	const update = api.releases.useUpdateSingle({
		onSuccess: () => props.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		const fields = getScheduleFields(
			props.release.scheduledAt,
			props.release.scheduledTimezone ?? getDefaultTimezone(),
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
						id: props.release.id,
						body: { scheduledAt, scheduledTimezone: timezone() },
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("releases.schedule.title")}</Modal.Title>
					<Modal.Description>
						{T()("releases.schedule.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<ReleaseScheduleFields
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
								? T()("releases.schedule.future")
								: update.errors()?.message
						}
					/>
					<Modal.Actions>
						<Show when={props.release.scheduledAt}>
							<Button
								variant="danger-ghost"
								loading={update.action.isPending}
								onClick={() =>
									update.action.mutate({
										id: props.release.id,
										body: { scheduledAt: null, scheduledTimezone: null },
									})
								}
							>
								{T()("releases.schedule.remove")}
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

export default ReleaseScheduleModal;
