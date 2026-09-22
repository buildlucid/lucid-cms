import type { PublishOperation } from "@types";
import type { Component } from "solid-js";
import type { PublishOperationDecisionAction } from "@/components/PublishOperationDecisionModal/PublishOperationDecisionModal";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	getPublishOperationExecutionStatusLabel,
	getPublishOperationExecutionStatusVariant,
	getPublishOperationStatusLabel,
	getPublishOperationStatusVariant,
} from "@/utils/publish-operations";
import PublishOperationUserCell from "./parts/PublishOperationUserCell";
import ReleaseRequestCommentsCell from "./parts/ReleaseRequestCommentsCell";
import ReleaseRequestReviewersCell from "./parts/ReleaseRequestReviewersCell";
import ReleaseRequestTitleCell from "./parts/ReleaseRequestTitleCell";

interface ReleaseRequestRowProps {
	index: number;
	request: PublishOperation;
	collectionLabel: string;
	preview: {
		available: boolean;
		permission: boolean;
		loading: boolean;
		onCopy: () => void;
	};
	callbacks: {
		openDecision: (
			_operation: PublishOperation,
			_action: PublishOperationDecisionAction,
		) => void;
		openSchedule: (_operation: PublishOperation) => void;
		openReviewers: (_operation: PublishOperation) => void;
		retry: (_operation: PublishOperation) => void;
	};
}

const ReleaseRequestTableRow: Component<ReleaseRequestRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const requestHref = () =>
		`/lucid/collections/${props.request.collectionKey}/${props.request.documentId}/release-requests/${props.request.id}`;

	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.open.request"),
					type: "link",
					icon: "eye",
					href: requestHref(),
					sortOrder: 0,
				},
				{
					type: "button",
					label: T()("preview.copy.group"),
					icon: "link",
					onClick: props.preview.onCopy,
					show: props.preview.available,
					permission: props.preview.permission,
					loading: props.preview.loading,
					excludeFromRowClick: true,
					sortOrder: 10,
				},
				{
					type: "button",
					label: T()("common.approve"),
					icon: "check",
					onClick: () => props.callbacks.openDecision(props.request, "approve"),
					show:
						props.request.status === "pending" &&
						props.request.permissions.review === true,
					variant: "primary",
					sortOrder: 50,
				},
				{
					type: "button",
					label: T()("common.reject"),
					icon: "ban",
					onClick: () => props.callbacks.openDecision(props.request, "reject"),
					show:
						props.request.status === "pending" &&
						props.request.permissions.review === true,
					variant: "danger",
					sortOrder: 70,
				},
				{
					type: "button",
					label: props.request.scheduledAt
						? T()("common.reschedule.release")
						: T()("common.schedule"),
					icon: "calendar",
					onClick: () => props.callbacks.openSchedule(props.request),
					show: props.request.permissions.reschedule === true,
					sortOrder: 30,
				},
				{
					type: "button",
					label: T()("actions.update.reviewers"),
					icon: "users",
					onClick: () => props.callbacks.openReviewers(props.request),
					show: props.request.permissions.updateReviewers === true,
					sortOrder: 40,
				},
				{
					type: "button",
					label: T()("common.retry.release"),
					icon: "rotate",
					onClick: () => props.callbacks.retry(props.request),
					show: props.request.permissions.retry === true,
					variant: "primary",
					sortOrder: 60,
				},
				{
					type: "button",
					label: T()("common.cancel"),
					icon: "ban",
					onClick: () => props.callbacks.openDecision(props.request, "cancel"),
					show: props.request.permissions.cancel === true,
					variant: "danger",
					sortOrder: 80,
				},
			]}
		>
			<ReleaseRequestTitleCell
				column="request"
				request={props.request}
				collectionLabel={props.collectionLabel}
			/>
			<Table.Pill
				column="status"
				text={getPublishOperationStatusLabel(props.request.status)}
				variant={getPublishOperationStatusVariant(props.request.status)}
			/>
			<Table.Pill
				column="executionStatus"
				text={getPublishOperationExecutionStatusLabel(
					props.request.executionStatus,
				)}
				variant={getPublishOperationExecutionStatusVariant(
					props.request.executionStatus,
				)}
			/>
			<PublishOperationUserCell
				column="requestedBy"
				user={props.request.requestedBy}
			/>
			<ReleaseRequestReviewersCell
				column="reviewers"
				assignees={props.request.assignees}
			/>
			<ReleaseRequestCommentsCell
				column="comments"
				request={props.request}
				minWidth={280}
			/>
			<Table.Date
				column="createdAt"
				date={props.request.createdAt}
				includeTime={true}
			/>
			<Table.Date
				column="scheduledAt"
				date={props.request.scheduledAt}
				includeTime={true}
			/>
		</Table.Row>
	);
};

export default ReleaseRequestTableRow;
