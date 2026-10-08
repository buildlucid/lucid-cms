import type { JobStatus } from "@types";
import type { PillVariant } from "@/components/Pill/Pill";

export const jobStatusPills: Record<JobStatus, PillVariant> = {
	queued: "outline",
	running: "primary-subtle",
	completed: "success-subtle",
	failed: "danger-subtle",
	cancelled: "outline",
};
