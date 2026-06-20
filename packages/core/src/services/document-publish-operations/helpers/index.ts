import constants from "../../../constants/constants.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { resolveCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { QueueEvent } from "../../../libs/queue/types.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { LucidAuth } from "../../../types/hono.js";

/** Approval states that still represent an unresolved release for a document target. */
export const activePublishOperationStatuses = ["pending", "approved"] as const;

/** Execution states that can still be completed by approval, queue dispatch, retry, or cancellation. */
export const unresolvedPublishOperationExecutionStatuses = [
	"awaiting_approval",
	"scheduled",
	"executing",
	"failed",
] as const;

/** Version type used to freeze publish operation snapshots before execution. */
export const snapshotVersionType =
	constants.collectionBuilder.publishing.snapshotVersionType;

/** Queue event used to execute a stored publish operation from delayed dispatch. */
export const publishOperationExecuteEvent =
	"document-publish-operation:execute" satisfies QueueEvent;

/** Lookahead for queue dispatch; keeps scheduling comfortably below provider delay limits. */
export const schedulingDispatchWindowHours = 6;

export const schedulingDispatchWindowMs =
	schedulingDispatchWindowHours * 60 * 60 * 1000; // 6 hours

/** Returns environment targets that require release review for the collection. */
export const getPublishOperationTargets = (collection: CollectionBuilder) => {
	const targets = collection.getData.config.review?.requiredFor;
	if (targets === undefined) return [];

	const environmentKeys = collection.getData.config.environments.map(
		(environment) => environment.key,
	);
	return targets.filter((target) => environmentKeys.includes(target));
};

/** Checks whether the target participates in the review-backed publish operation flow. */
export const canUsePublishOperationsForTarget = (params: {
	collection: CollectionBuilder;
	target: string;
}) => getPublishOperationTargets(params.collection).includes(params.target);

/** Returns environment targets that must be current before a release can be created. */
export const getReleaseRequirementTargets = (params: {
	collection: CollectionBuilder;
	target: string;
}) => {
	const targetEnvironment = params.collection.getData.config.environments.find(
		(environment) => environment.key === params.target,
	);

	return Array.from(new Set(targetEnvironment?.requires ?? []));
};

/** Returns configured release requirements whose content does not match the submitted source. */
export const getUnmetReleaseRequirementTargets = (params: {
	collection: CollectionBuilder;
	target: string;
	sourceContentId: string;
	contentIdsByTarget: Map<string, string | null | undefined>;
}) =>
	getReleaseRequirementTargets({
		collection: params.collection,
		target: params.target,
	}).filter(
		(requiredTarget) =>
			params.contentIdsByTarget.get(requiredTarget) !== params.sourceContentId,
	);

/** Checks scheduling support across collection config, target type, and runtime queue capability. */
export const collectionTargetSupportsScheduling = (params: {
	collection: CollectionBuilder;
	target: string;
	queueSupportsScheduling: boolean;
}) => {
	const targetIsEnvironment =
		params.collection.getData.config.environments.some(
			(environment) => environment.key === params.target,
		);

	return (
		targetIsEnvironment &&
		params.collection.getData.config.scheduling === true &&
		params.queueSupportsScheduling === true
	);
};

/** Determines whether a scheduled operation is close enough for a delayed queue job. */
export const isInSchedulingDispatchWindow = (params: {
	scheduledAt: Date;
	now?: Date;
}) => {
	const now = params.now ?? new Date();
	return (
		params.scheduledAt.getTime() <= now.getTime() + schedulingDispatchWindowMs
	);
};

/** Normalizes optional schedule input and validates UTC minute precision plus IANA timezone. */
export const parseScheduleInput = (params: {
	scheduledAt?: string | null;
	scheduledTimezone?: string | null;
}): {
	error?: LucidErrorData;
	data?: {
		scheduledAt: string | null;
		scheduledTimezone: string | null;
		scheduledDate: Date | null;
		provided: boolean;
	};
} => {
	const scheduledAtProvided = params.scheduledAt !== undefined;
	const timezoneProvided = params.scheduledTimezone !== undefined;

	if (!scheduledAtProvided && !timezoneProvided) {
		return {
			data: {
				scheduledAt: null,
				scheduledTimezone: null,
				scheduledDate: null,
				provided: false,
			},
		};
	}

	if (params.scheduledAt === null) {
		return {
			data: {
				scheduledAt: null,
				scheduledTimezone: null,
				scheduledDate: null,
				provided: true,
			},
		};
	}

	if (!params.scheduledAt || !params.scheduledTimezone) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.schedule.incomplete"),
				status: 400,
			},
		};
	}

	const scheduledDate = new Date(params.scheduledAt);
	if (Number.isNaN(scheduledDate.getTime())) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.schedule.invalid"),
				status: 400,
			},
		};
	}

	if (
		scheduledDate.getUTCSeconds() !== 0 ||
		scheduledDate.getUTCMilliseconds() !== 0
	) {
		return {
			error: {
				type: "basic",
				message: copy(
					"server:core.publish.operations.schedule.minute.precision",
				),
				status: 400,
			},
		};
	}

	try {
		new Intl.DateTimeFormat("en-US", {
			timeZone: params.scheduledTimezone,
		}).format(scheduledDate);
	} catch {
		return {
			error: {
				type: "basic",
				message: copy(
					"server:core.publish.operations.schedule.timezone.invalid",
				),
				status: 400,
			},
		};
	}

	return {
		data: {
			scheduledAt: scheduledDate.toISOString(),
			scheduledTimezone: params.scheduledTimezone,
			scheduledDate,
			provided: true,
		},
	};
};

/** Resolves and checks the collection permission required for the action and environment target. */
export const hasCollectionTargetPermission = (params: {
	user: LucidAuth;
	collection: CollectionBuilder;
	action: "publish" | "review";
	target: string;
}) => {
	const permission = resolveCollectionPermission({
		collection: params.collection,
		action: params.action,
		target: params.target,
	});

	return hasAccess({
		user: params.user,
		requiredPermissions: [permission],
	});
};
