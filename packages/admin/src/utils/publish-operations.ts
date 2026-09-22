import type {
	PublishOperation,
	PublishOperationExecutionStatus,
	PublishOperationStatus,
	PublishOperationUser,
} from "@types";
import type { PillProps } from "@/components/Pill/Pill";
import type { StatusIndicatorVariant } from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import helpers from "@/utils/helpers";

type PublishOperationPillVariant = Extract<
	PillProps["variant"],
	| "warning-subtle"
	| "primary-subtle"
	| "success-subtle"
	| "danger-subtle"
	| "outline"
>;

const getPublishOperationIndicatorVariant = (
	variant: PublishOperationPillVariant,
): StatusIndicatorVariant => {
	switch (variant) {
		case "warning-subtle":
			return "warning-subtle";
		case "primary-subtle":
			return "primary-subtle";
		case "success-subtle":
			return "success-subtle";
		case "danger-subtle":
			return "danger-subtle";
		case "outline":
			return "neutral-subtle";
	}
};

export const hasPublishOperationRequirementDrift = (
	operation: Pick<PublishOperation, "releaseRequirements">,
) =>
	operation.releaseRequirements.some(
		(requirement) => requirement.status !== "in-sync",
	);

export const hasPublishOperationContextChanged = (
	operation: Pick<PublishOperation, "isOutdated" | "releaseRequirements">,
) => operation.isOutdated || hasPublishOperationRequirementDrift(operation);

export const formatPublishOperationUser = (user: PublishOperationUser) => {
	return helpers.formatUserName(user, "username-and-name") || "-";
};

export const getPublishOperationStatusVariant = (
	status: PublishOperationStatus,
): PublishOperationPillVariant => {
	switch (status) {
		case "pending":
			return "warning-subtle";
		case "approved":
			return "success-subtle";
		case "rejected":
		case "cancelled":
			return "danger-subtle";
		case "superseded":
			return "outline";
	}
};

/** Uses the same status colours as the release-request table. */
export const getPublishOperationStatusIndicatorVariant = (
	status: PublishOperationStatus,
) =>
	getPublishOperationIndicatorVariant(getPublishOperationStatusVariant(status));

export const getPublishOperationStatusLabel = (
	status: PublishOperationStatus,
) => {
	switch (status) {
		case "pending":
			return T()("common.status.pending");
		case "approved":
			return T()("common.status.approved");
		case "rejected":
			return T()("common.status.rejected");
		case "cancelled":
			return T()("common.status.cancelled");
		case "superseded":
			return T()("common.status.superseded");
	}
};

export const getPublishOperationExecutionStatusVariant = (
	status: PublishOperationExecutionStatus,
): PublishOperationPillVariant => {
	switch (status) {
		case "awaiting_approval":
		case "scheduled":
			return "warning-subtle";
		case "executing":
			return "primary-subtle";
		case "executed":
			return "success-subtle";
		case "failed":
		case "cancelled":
			return "danger-subtle";
	}
};

/** Uses the same execution-state colours as the release-request table. */
export const getPublishOperationExecutionStatusIndicatorVariant = (
	status: PublishOperationExecutionStatus,
) =>
	getPublishOperationIndicatorVariant(
		getPublishOperationExecutionStatusVariant(status),
	);

export const getPublishOperationExecutionStatusLabel = (
	status: PublishOperationExecutionStatus,
) => {
	switch (status) {
		case "awaiting_approval":
			return T()("common.status.awaiting.approval");
		case "scheduled":
			return T()("common.status.scheduled");
		case "executing":
			return T()("common.status.executing");
		case "executed":
			return T()("common.status.executed");
		case "failed":
			return T()("common.status.failed");
		case "cancelled":
			return T()("common.status.cancelled");
	}
};
