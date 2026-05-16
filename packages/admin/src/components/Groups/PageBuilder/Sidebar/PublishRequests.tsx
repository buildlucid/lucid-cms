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
	const [scheduleEnabled, setScheduleEnabled] = createSignal(false);
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Memos
	const environmentCount = createMemo(() =>
		Math.max(props.collection()?.config.environments.length ?? 1, 1),
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
			(props.collection()?.config.review?.requiredFor?.length ?? 0) > 0 &&
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
		() => (props.collection()?.config.review?.requiredFor?.length ?? 0) > 0,
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

	// ----------------------------------
	// Functions
	const resetSchedule = () => {
		setScheduleEnabled(false);
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
			setScheduleEnabled(true);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};

	// ----------------------------------
	// Render
	return (
		<Show when={sectionEnabled()}>
			<Show when={reviewEnabled()}>
				<PublishOperationSection
					title={T()("publish_requests")}
					icon={<FaSolidPaperPlane size={14} />}
					storageKey="lucid:page-builder-sidebar:release-requests-open"
					emptyCopy={T()("no_pending_publish_requests")}
					collection={props.collection}
					rows={releaseRequestRows()}
					isLoading={pendingRequests.isLoading}
					onSchedule={openSchedule}
				/>
			</Show>
			<Show when={schedulingEnabled()}>
				<PublishOperationSection
					title={T()("scheduled_releases")}
					icon={<FaSolidCalendar size={14} />}
					storageKey="lucid:page-builder-sidebar:scheduled-releases-open"
					emptyCopy={T()("no_scheduled_releases")}
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
					title: T()("reschedule_release"),
					confirm: T()("update_schedule"),
					error: error(),
				}}
				callbacks={{
					onConfirm: async () => {
						const operation = selectedOperation();
						if (!operation) return;

						const scheduledAt = scheduleEnabled()
							? getScheduledAt({
									date: scheduleDate(),
									time: scheduleTime(),
									timezone: scheduleTimezone(),
								})
							: null;
						if (scheduleEnabled() && !scheduledAt) {
							setValidationError(T()("schedule_release_required"));
							return;
						}

						await reschedule.action.mutateAsync({
							id: operation.id,
							body: {
								scheduledAt,
								scheduledTimezone: scheduledAt ? scheduleTimezone() : null,
							},
						});
					},
					onCancel: () => {
						setSelectedOperation(undefined);
						resetSchedule();
						setValidationError(undefined);
						reschedule.reset();
					},
				}}
			>
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
			</Confirmation>
		</Show>
	);
};
