import type {
	PublishOperationExecutionStatus,
	PublishOperationStatus,
	PublishOperationUser,
} from "@types";
import type { PillProps } from "@/components/Partials/Pill";
import T from "@/translations";
import helpers from "@/utils/helpers";

export const formatPublishOperationUser = (user: PublishOperationUser) => {
	return helpers.formatUserName(user, "username") || "-";
};

export const getPublishOperationStatusTheme = (
	status: PublishOperationStatus,
): PillProps["theme"] => {
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
): PillProps["theme"] => {
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
