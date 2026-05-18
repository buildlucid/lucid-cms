import type { PublishOperation } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import PublishOperationUserCol from "@/components/Tables/Columns/PublishOperationUserCol";
import ReleaseRequestCommentsCol from "@/components/Tables/Columns/ReleaseRequestCommentsCol";
import ReleaseRequestReviewersCol from "@/components/Tables/Columns/ReleaseRequestReviewersCol";
import ReleaseRequestTitleCol from "@/components/Tables/Columns/ReleaseRequestTitleCol";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import {
	getPublishOperationExecutionStatusLabel,
	getPublishOperationExecutionStatusTheme,
	getPublishOperationStatusLabel,
	getPublishOperationStatusTheme,
} from "@/utils/publish-operations";
import type { PublishOperationDecisionAction } from "../../Modals/Documents/PublishOperationDecision";

interface ReleaseRequestRowProps extends TableRowProps {
	request: PublishOperation;
	collectionLabel: string;
	include: boolean[];
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

const ReleaseRequestRow: Component<ReleaseRequestRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const requestHref = () =>
		`/lucid/collections/${props.request.collectionKey}/${props.request.documentId}/release-requests/${props.request.id}`;

	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={[
				{
					label: T()("open_request"),
					type: "link",
					href: requestHref(),
					sortOrder: 0,
				},
				{
					type: "button",
					label: T()("approve"),
					onClick: () => props.callbacks.openDecision(props.request, "approve"),
					hide:
						props.request.status !== "pending" ||
						props.request.permissions.review !== true,
					theme: "primary",
					sortOrder: 10,
				},
				{
					type: "button",
					label: T()("reject"),
					onClick: () => props.callbacks.openDecision(props.request, "reject"),
					hide:
						props.request.status !== "pending" ||
						props.request.permissions.review !== true,
					theme: "error",
					sortOrder: 20,
				},
				{
					type: "button",
					label: props.request.scheduledAt
						? T()("reschedule_release")
						: T()("schedule"),
					onClick: () => props.callbacks.openSchedule(props.request),
					hide: props.request.permissions.reschedule !== true,
					sortOrder: 30,
				},
				{
					type: "button",
					label: T()("update_reviewers"),
					onClick: () => props.callbacks.openReviewers(props.request),
					hide: props.request.permissions.updateReviewers !== true,
					sortOrder: 40,
				},
				{
					type: "button",
					label: T()("retry_release"),
					onClick: () => props.callbacks.retry(props.request),
					hide: props.request.permissions.retry !== true,
					theme: "primary",
					sortOrder: 50,
				},
				{
					type: "button",
					label: T()("cancel"),
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
			<PillCol
				text={getPublishOperationStatusLabel(props.request.status)}
				theme={getPublishOperationStatusTheme(props.request.status)}
				options={{ include: props.include[1] }}
			/>
			<PillCol
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
			<DateCol
				date={props.request.createdAt}
				includeTime={true}
				options={{ include: props.include[6] }}
			/>
			<DateCol
				date={props.request.scheduledAt}
				includeTime={true}
				options={{ include: props.include[7] }}
			/>
		</Tr>
	);
};

export default ReleaseRequestRow;
