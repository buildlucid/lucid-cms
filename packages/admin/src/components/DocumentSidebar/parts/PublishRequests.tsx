import type { Collection, PublishOperation } from "@types";
import { FaSolidCalendar, FaSolidPaperPlane } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Modal } from "@/components/Modal/Modal";
import ReleaseScheduleFields from "@/components/ReleaseScheduleFields/ReleaseScheduleFields";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
import PublishOperationSection from "./PublishOperationSection";

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
		Math.max(props.collection()?.publishing.targets.length ?? 1, 1),
	);
	const canReadPublishOperations = createMemo(
		() => userStore.get.hasPermission([Permissions.PublishOperationsRead]).all,
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
			canReadPublishOperations() &&
			(props.collection()?.publishing.review?.requiredFor?.length ?? 0) > 0 &&
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
			canReadPublishOperations() &&
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
		() => (props.collection()?.publishing.review?.requiredFor?.length ?? 0) > 0,
	);
	const schedulingEnabled = createMemo(
		() => props.collection()?.capabilities.scheduling === true,
	);
	const sectionEnabled = createMemo(
		() =>
			canReadPublishOperations() && (reviewEnabled() || schedulingEnabled()),
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
					icon={<FaSolidPaperPlane size={12} />}
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
					icon={<FaSolidCalendar size={12} />}
					preferenceKey="pageBuilder.sidebar.scheduledReleases"
					emptyCopy={T()("empty.states.scheduled.releases")}
					collection={props.collection}
					rows={scheduledReleaseRows()}
					isLoading={scheduledRequests.isLoading}
					onSchedule={openSchedule}
				/>
			</Show>
			<Modal.Root
				role="alertdialog"
				open={selectedOperation() !== undefined}
				onOpenChange={(open) => {
					if (open) return;
					setSelectedOperation(undefined);
					resetSchedule();
					setValidationError(undefined);
					reschedule.reset();
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{selectedOperationHasSchedule()
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
								variant="danger-outline"
								size="md"
								type="button"
								loading={reschedule.action.isPending}
								onClick={removeSchedule}
							>
								{T()("documents.release.schedule.remove")}
							</Button>
						</Show>
						<Button
							variant="primary"
							size="md"
							type="button"
							loading={reschedule.action.isPending}
							onClick={saveSchedule}
						>
							{selectedOperationHasSchedule()
								? T()("actions.update.schedule")
								: T()("documents.release.schedule.action")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</Modal.Root>
		</Show>
	);
};
