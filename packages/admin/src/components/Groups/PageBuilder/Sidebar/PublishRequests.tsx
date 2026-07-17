import type { Collection, PublishOperation } from "@types";
import { FaSolidCalendar, FaSolidPaperPlane } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import ReleaseScheduleFields from "@/components/Modals/Documents/ReleaseScheduleFields";
import Button from "@/components/Partials/Button";
import api from "@/services/api";
import T from "@/translations";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
import PublishOperationSection from "./Partials/PublishOperationSection";

export const PublishRequests: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------
	// State
	const [selectedOperation, setSelectedOperation] =
		createSignal<PublishOperation>();
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Memos
	const environmentCount = createMemo(() =>
		Math.max(props.collection()?.environments.length ?? 1, 1),
	);

	// ----------------------------------
	// Queries
	const pendingRequests = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "pending",
				operationType: () => "request",
				collectionKey: props.collectionKey,
				documentId: props.documentId,
			},
			perPage: () => environmentCount(),
		},
		enabled: () =>
			(props.collection()?.review?.requiredFor?.length ?? 0) > 0 &&
			props.documentId() !== undefined,
	});
	const scheduledRequests = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "approved",
				executionStatus: () => ["scheduled", "failed"],
				collectionKey: props.collectionKey,
				documentId: props.documentId,
			},
			perPage: () => environmentCount(),
		},
		enabled: () =>
			props.collection()?.capabilities.scheduling === true &&
			props.documentId() !== undefined,
	});
	const reschedule = api.publishOperations.useReschedule({
		onSuccess: () => {
			setSelectedOperation(undefined);
			resetSchedule();
			setValidationError(undefined);
		},
	});

	// ----------------------------------
	// Memos
	const reviewEnabled = createMemo(
		() => (props.collection()?.review?.requiredFor?.length ?? 0) > 0,
	);
	const schedulingEnabled = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const sectionEnabled = createMemo(
		() => reviewEnabled() || schedulingEnabled(),
	);
	const releaseRequestRows = createMemo(() =>
		[...(pendingRequests.data?.data ?? [])].sort((a, b) =>
			(a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
		),
	);
	const scheduledReleaseRows = createMemo(() =>
		[...(scheduledRequests.data?.data ?? [])].sort((a, b) =>
			(a.scheduledAt ?? a.createdAt ?? "").localeCompare(
				b.scheduledAt ?? b.createdAt ?? "",
			),
		),
	);
	const error = createMemo(
		() => validationError() || reschedule.errors()?.message,
	);
	const selectedOperationHasSchedule = createMemo(() =>
		Boolean(selectedOperation()?.scheduledAt),
	);

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};
	const openSchedule = (operation: PublishOperation) => {
		setSelectedOperation(operation);
		setValidationError(undefined);
		reschedule.reset();

		if (operation.scheduledAt) {
			const scheduledAt = new Date(operation.scheduledAt);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};
	const saveSchedule = async () => {
		const operation = selectedOperation();
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
		const operation = selectedOperation();
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
	// Render
	return (
		<Show when={sectionEnabled()}>
			<Show when={reviewEnabled()}>
				<PublishOperationSection
					title={T()("publish.requests.list.title")}
					icon={<FaSolidPaperPlane size={14} />}
					preferenceKey="pageBuilder.sidebar.releaseRequests"
					emptyCopy={T()("empty.states.pending.publish.requests")}
					collection={props.collection}
					rows={releaseRequestRows()}
					isLoading={pendingRequests.isLoading}
					onSchedule={openSchedule}
				/>
			</Show>
			<Show when={schedulingEnabled()}>
				<PublishOperationSection
					title={T()("common.scheduled.releases")}
					icon={<FaSolidCalendar size={14} />}
					preferenceKey="pageBuilder.sidebar.scheduledReleases"
					emptyCopy={T()("empty.states.scheduled.releases")}
					collection={props.collection}
					rows={scheduledReleaseRows()}
					isLoading={scheduledRequests.isLoading}
					onSchedule={openSchedule}
				/>
			</Show>
			<Confirmation
				theme="primary"
				state={{
					open: selectedOperation() !== undefined,
					setOpen: (open) => {
						if (!open) setSelectedOperation(undefined);
					},
					isLoading: reschedule.action.isPending,
					isError: !!error(),
				}}
				copy={{
					title: selectedOperationHasSchedule()
						? T()("common.reschedule.release")
						: T()("documents.release.schedule.action"),
					description: T()("modals.common.schedule.release.description"),
					confirm: T()("actions.update.schedule"),
					error: error(),
				}}
				callbacks={{
					onConfirm: saveSchedule,
					onCancel: () => {
						setSelectedOperation(undefined);
						resetSchedule();
						setValidationError(undefined);
						reschedule.reset();
					},
				}}
				slots={{
					actions: (
						<>
							<Button
								theme="border-outline"
								size="medium"
								type="button"
								disabled={reschedule.action.isPending}
								onClick={() => {
									setSelectedOperation(undefined);
									resetSchedule();
									setValidationError(undefined);
									reschedule.reset();
								}}
							>
								{T()("common.cancel")}
							</Button>
							<Show when={selectedOperationHasSchedule()}>
								<Button
									theme="danger-outline"
									size="medium"
									type="button"
									loading={reschedule.action.isPending}
									onClick={removeSchedule}
								>
									{T()("documents.release.schedule.remove")}
								</Button>
							</Show>
							<Button
								theme="primary"
								size="medium"
								type="button"
								loading={reschedule.action.isPending}
								onClick={saveSchedule}
							>
								{selectedOperationHasSchedule()
									? T()("actions.update.schedule")
									: T()("documents.release.schedule.action")}
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
		</Show>
	);
};
