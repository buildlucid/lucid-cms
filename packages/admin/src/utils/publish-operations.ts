import type {
	PublishOperation,
	PublishOperationExecutionStatus,
	PublishOperationStatus,
	PublishOperationUser,
} from "@types";
import type { PillProps } from "@/components/Partials/Pill";
import T from "@/translations";
import helpers from "@/utils/helpers";

type PublishOperationPillTheme = Extract<
	PillProps["theme"],
	"warning-opaque" | "primary-opaque" | "error-opaque" | "outline"
>;

const getPublishOperationDotClass = (theme: PublishOperationPillTheme) => {
	switch (theme) {
		case "warning-opaque":
			return "border-warning-base/60 bg-warning-base/40";
		case "primary-opaque":
			return "border-primary-muted-border bg-primary-muted-bg";
		case "error-opaque":
			return "border-error-base/60 bg-error-base/40";
		case "outline":
			return "border-border bg-input-base";
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
	return helpers.formatUserName(user, "username") || "-";
};

export const getPublishOperationStatusTheme = (
	status: PublishOperationStatus,
): PublishOperationPillTheme => {
	switch (status) {
		case "pending":
			return "warning-opaque";
		case "approved":
			return "primary-opaque";
		case "rejected":
		case "cancelled":
			return "error-opaque";
		case "superseded":
			return "outline";
	}
};

/** Uses the same status colours as the release-request table. */
export const getPublishOperationStatusDotClass = (
	status: PublishOperationStatus,
) => getPublishOperationDotClass(getPublishOperationStatusTheme(status));

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

export const getPublishOperationExecutionStatusTheme = (
	status: PublishOperationExecutionStatus,
): PublishOperationPillTheme => {
	switch (status) {
		case "awaiting_approval":
		case "scheduled":
			return "warning-opaque";
		case "executing":
		case "executed":
			return "primary-opaque";
		case "failed":
		case "cancelled":
			return "error-opaque";
	}
};

/** Uses the same execution-state colours as the release-request table. */
export const getPublishOperationExecutionStatusDotClass = (
	status: PublishOperationExecutionStatus,
) =>
	getPublishOperationDotClass(getPublishOperationExecutionStatusTheme(status));

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
