import type {
	Collection,
	PublishOperation,
	PublishOperationStatus,
} from "@types";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidClock,
	FaSolidComment,
	FaSolidT,
	FaSolidUser,
	FaSolidUsers,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table/Table";
import PublishOperationDecision, {
	type PublishOperationDecisionAction,
} from "@/components/Modals/Documents/PublishOperationDecision";
import PublishOperationReviewers from "@/components/Modals/Documents/PublishOperationReviewers";
import PublishOperationSchedule from "@/components/Modals/Documents/PublishOperationSchedule";
import ReleaseRequestOverview from "@/components/Partials/ReleaseRequestOverview";
import ReleaseRequestRow from "@/components/Tables/Rows/ReleaseRequestRow";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import api from "@/services/api";
import T from "@/translations";

export const ReleaseRequestsList: Component<{
	state: {
		searchParams: QueryStateResponse;
	};
	data: {
		collections: Collection[];
		collectionLabels: Map<string, string>;
		reviewCollectionKeys: Set<string>;
	};
	status: {
		collections: {
			isError: boolean;
			isSuccess: boolean;
			isLoading: boolean;
		};
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	const [selectedOperation, setSelectedOperation] =
		createSignal<PublishOperation>();
	const [decisionOpen, setDecisionOpen] = createSignal(false);
	const [decisionAction, setDecisionAction] =
		createSignal<PublishOperationDecisionAction>();
	const [scheduleOpen, setScheduleOpen] = createSignal(false);
	const [reviewersOpen, setReviewersOpen] = createSignal(false);

	const retry = api.publishOperations.useRetry();

	// ----------------------------------
	// Memos
	const collectionMap = createMemo(
		() =>
			new Map(
				props.data.collections.map((collection) => [
					collection.key,
					collection,
				]),
			),
	);
	const collectionKeyFilter = createMemo(() => {
		const value = props.state.searchParams.filters().get("collectionKey");
		return typeof value === "string" && value.length > 0 ? value : undefined;
	});
	const targetFilter = createMemo(() => {
		const value = props.state.searchParams.filters().get("target");
		return typeof value === "string" && value.length > 0 ? value : undefined;
	});
	const statusFilter = createMemo(() => {
		const value = props.state.searchParams.filters().get("status");
		return Array.isArray(value) && value.length > 0
			? (value as PublishOperationStatus[])
			: undefined;
	});

	// -------------------------------
	// Queries
	const requests = api.publishOperations.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.queryString,
			filters: {
				status: () =>
					statusFilter() === undefined
						? ([
								"pending",
								"approved",
								"rejected",
								"cancelled",
							] satisfies PublishOperationStatus[])
						: undefined,
				operationType: () => "request",
			},
		},
		enabled: () => props.state.searchParams.ready(),
	});
	const overview = api.publishOperations.useGetOverview({
		queryParams: {
			filters: {
				collectionKey: collectionKeyFilter,
				target: targetFilter,
			},
		},
		enabled: () => props.state.searchParams.ready(),
	});

	// ------------------------------
	// Memos
	const rows = createMemo(() =>
		(requests.data?.data ?? []).filter((request) =>
			props.data.reviewCollectionKeys.has(request.collectionKey),
		),
	);
	const selectedCollection = createMemo(() => {
		const operation = selectedOperation();
		if (!operation) return undefined;

		return collectionMap().get(operation.collectionKey);
	});

	// ----------------------------------
	// Functions
	const openDecision = (
		operation: PublishOperation,
		action: PublishOperationDecisionAction,
	) => {
		setSelectedOperation(operation);
		setDecisionAction(action);
		setDecisionOpen(true);
	};
	const openSchedule = (operation: PublishOperation) => {
		setSelectedOperation(operation);
		setScheduleOpen(true);
	};
	const openReviewers = (operation: PublishOperation) => {
		setSelectedOperation(operation);
		setReviewersOpen(true);
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<ReleaseRequestOverview
				overview={overview.data?.data}
				loading={overview.isFetching}
				searchParams={props.state.searchParams}
			/>
			<DynamicContent
				class="mt-4 border-t border-border"
				state={{
					isError:
						requests.isError ||
						props.status.collections.isError ||
						overview.isError,
					isSuccess:
						requests.isSuccess &&
						props.status.collections.isSuccess &&
						overview.isSuccess,
					isLoading:
						requests.isLoading ||
						props.status.collections.isLoading ||
						overview.isLoading ||
						!props.state.searchParams.ready(),
					isEmpty: rows().length === 0,
					searchParams: props.state.searchParams,
				}}
				slot={{
					footer: (
						<Paginated
							state={{
								searchParams: props.state.searchParams,
								meta: requests.data?.meta,
							}}
							options={{
								padding: "24",
							}}
						/>
					),
				}}
				copy={{
					noEntries: {
						title: T()("empty.states.publish.requests.title"),
						description: T()("empty.states.publish.requests.description"),
					},
				}}
			>
				<Table
					key={"release-requests.list"}
					rows={rows().length}
					searchParams={props.state.searchParams}
					head={[
						{
							label: T()("documents.release.request"),
							key: "request",
							icon: <FaSolidT />,
							minWidth: 320,
						},
						{
							label: T()("common.status"),
							key: "status",
							icon: <FaSolidCircleCheck />,
						},
						{
							label: T()("common.execution.status"),
							key: "executionStatus",
							icon: <FaSolidClock />,
						},
						{
							label: T()("common.requested.by"),
							key: "requestedBy",
							icon: <FaSolidUser />,
						},
						{
							label: T()("common.reviewers"),
							key: "reviewers",
							icon: <FaSolidUsers />,
						},
						{
							label: T()("common.comments"),
							key: "comments",
							icon: <FaSolidComment />,
							minWidth: 280,
						},
						{
							label: T()("common.requested.at"),
							key: "createdAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
						{
							label: T()("common.scheduled.for"),
							key: "scheduledAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
					]}
					state={{
						isLoading: requests.isFetching,
						isSuccess: requests.isSuccess,
					}}
					options={{
						isSelectable: false,
					}}
				>
					{({ include, isSelectable, selected, setSelected }) => (
						<Index each={rows()}>
							{(request, i) => (
								<ReleaseRequestRow
									index={i}
									request={request()}
									collectionLabel={
										props.data.collectionLabels.get(request().collectionKey) ??
										request().collectionKey
									}
									include={include}
									selected={selected[i]}
									options={{
										isSelectable,
									}}
									callbacks={{
										setSelected,
										openDecision,
										openSchedule,
										openReviewers,
										retry: (operation) => {
											void retry.action.mutateAsync({
												id: operation.id,
											});
										},
									}}
								/>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>
			<PublishOperationDecision
				collection={selectedCollection}
				operation={selectedOperation}
				action={decisionAction}
				state={{
					open: decisionOpen(),
					setOpen: setDecisionOpen,
				}}
				callbacks={{
					onClose: () => setDecisionAction(undefined),
					onSuccess: () => setDecisionAction(undefined),
				}}
			/>
			<PublishOperationSchedule
				operation={selectedOperation}
				state={{
					open: scheduleOpen(),
					setOpen: setScheduleOpen,
				}}
			/>
			<PublishOperationReviewers
				operation={selectedOperation}
				state={{
					open: reviewersOpen(),
					setOpen: setReviewersOpen,
				}}
			/>
		</>
	);
};
