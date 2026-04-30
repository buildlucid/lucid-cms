export type QueueEvent<T extends string = string> =
	| "alert:execute"
	| "email:send"
	| "media:delete"
	| "media:delete-unsynced"
	| "media:update-storage"
	| "collections:delete"
	| "locales:delete"
	| "users:delete"
	| "documents:delete"
	| "document-versions:delete-expired"
	| T;

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
	id: number;
	jobId: string;
	eventType: QueueEvent;
	eventData: Record<string, unknown>;
	queueAdapterKey: string;
	status: QueueJobStatus;
	priority: number | null;
	attempts: number;
	maxAttempts: number;
	errorMessage: string | null;
	createdAt: string | null;
	scheduledFor: string | null;
	startedAt: string | null;
	completedAt: string | null;
	failedAt: string | null;
	nextRetryAt: string | null;
	createdByUserId: number | null;
	updatedAt: string | null;
}
