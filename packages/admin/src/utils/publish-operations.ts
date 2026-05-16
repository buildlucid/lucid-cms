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
			return T()("pending");
		case "approved":
			return T()("approved");
		case "rejected":
			return T()("rejected");
		case "cancelled":
			return T()("cancelled");
		case "superseded":
			return T()("superseded");
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
			return "primary-opaque";
		case "executed":
			return "green";
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
			return T()("awaiting_approval");
		case "scheduled":
			return T()("scheduled");
		case "executing":
			return T()("executing");
		case "executed":
			return T()("executed");
		case "failed":
			return T()("failed");
		case "cancelled":
			return T()("cancelled");
	}
};
