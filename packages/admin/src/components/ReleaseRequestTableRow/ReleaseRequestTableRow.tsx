import type { PublishOperation } from "@types";
import type { Component } from "solid-js";
import type { PublishOperationDecisionAction } from "@/components/PublishOperationDecisionModal/PublishOperationDecisionModal";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import {
	getPublishOperationExecutionStatusLabel,
	getPublishOperationExecutionStatusTheme,
	getPublishOperationStatusLabel,
	getPublishOperationStatusTheme,
} from "@/utils/publish-operations";
import PublishOperationUserCol from "./parts/PublishOperationUserCol";
import ReleaseRequestCommentsCol from "./parts/ReleaseRequestCommentsCol";
import ReleaseRequestReviewersCol from "./parts/ReleaseRequestReviewersCol";
import ReleaseRequestTitleCol from "./parts/ReleaseRequestTitleCol";

interface ReleaseRequestRowProps extends TableRowProps {
	request: PublishOperation;
	collectionLabel: string;
	include: boolean[];
	preview: {
		available: boolean;
		permission: boolean;
		loading: boolean;
		onCopy: () => void;
	};
	callbacks: TableRowProps["callbacks"] & {
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
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
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
					hide: !props.preview.available,
					permission: props.preview.permission,
					isLoading: props.preview.loading,
					actionExclude: true,
					sortOrder: 20,
				},
				{
					type: "button",
					label: T()("common.approve"),
					icon: "check",
					onClick: () => props.callbacks.openDecision(props.request, "approve"),
					hide:
						props.request.status !== "pending" ||
						props.request.permissions.review !== true,
					theme: "primary",
					sortOrder: 10,
				},
				{
					type: "button",
					label: T()("common.reject"),
					icon: "ban",
					onClick: () => props.callbacks.openDecision(props.request, "reject"),
					hide:
						props.request.status !== "pending" ||
						props.request.permissions.review !== true,
					theme: "error",
					sortOrder: 55,
				},
				{
					type: "button",
					label: props.request.scheduledAt
						? T()("common.reschedule.release")
						: T()("common.schedule"),
					icon: "calendar",
					onClick: () => props.callbacks.openSchedule(props.request),
					hide: props.request.permissions.reschedule !== true,
					sortOrder: 30,
				},
				{
					type: "button",
					label: T()("actions.update.reviewers"),
					icon: "users",
					onClick: () => props.callbacks.openReviewers(props.request),
					hide: props.request.permissions.updateReviewers !== true,
					sortOrder: 40,
				},
				{
					type: "button",
					label: T()("common.retry.release"),
					icon: "rotate",
					onClick: () => props.callbacks.retry(props.request),
					hide: props.request.permissions.retry !== true,
					theme: "primary",
					sortOrder: 50,
				},
				{
					type: "button",
					label: T()("common.cancel"),
					icon: "ban",
					onClick: () => props.callbacks.openDecision(props.request, "cancel"),
					hide: props.request.permissions.cancel !== true,
					theme: "error",
					sortOrder: 60,
				},
			]}
		>
			<ReleaseRequestTitleCol
				request={props.request}
				collectionLabel={props.collectionLabel}
				options={{ include: props.include[0] }}
			/>
			<TablePillCell
				text={getPublishOperationStatusLabel(props.request.status)}
				theme={getPublishOperationStatusTheme(props.request.status)}
				options={{ include: props.include[1] }}
			/>
			<TablePillCell
				text={getPublishOperationExecutionStatusLabel(
					props.request.executionStatus,
				)}
				theme={getPublishOperationExecutionStatusTheme(
					props.request.executionStatus,
				)}
				options={{ include: props.include[2] }}
			/>
			<PublishOperationUserCol
				user={props.request.requestedBy}
				options={{ include: props.include[3] }}
			/>
			<ReleaseRequestReviewersCol
				assignees={props.request.assignees}
				options={{ include: props.include[4] }}
			/>
			<ReleaseRequestCommentsCol
				request={props.request}
				options={{ include: props.include[5], minWidth: 280 }}
			/>
			<TableDateCell
				date={props.request.createdAt}
				includeTime={true}
				options={{ include: props.include[6] }}
			/>
			<TableDateCell
				date={props.request.scheduledAt}
				includeTime={true}
				options={{ include: props.include[7] }}
			/>
		</TableRow>
	);
};

export default ReleaseRequestTableRow;
