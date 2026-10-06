import type { RequestBlocker } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { workflowStageAllowsTarget } from "../../document-workflows/helpers/index.js";
import type {
	RequestDocumentRecord,
	RequestDocumentState,
	RequestRecord,
} from "../types.js";
import getAllowedTargets from "./get-allowed-targets.js";
import getTargetReview from "./get-target-review.js";

const getDocumentBlockers = (
	context: ServiceContext,
	data: {
		request: RequestRecord;
		document: RequestDocumentRecord;
		state: RequestDocumentState;
	},
): RequestBlocker[] => {
	const { request, document, state } = data;
	if (request.status !== "open") return [];
	if (!state.collection) return [{ code: "collection_unavailable" }];
	if (state.migrationRequired) return [{ code: "migration_required" }];
	if (state.deleted) return [{ code: "document_deleted" }];

	const blockers: RequestBlocker[] = [];

	if (state.collection.getData.locked) {
		blockers.push({ code: "collection_locked" });
	}

	if (!state.source) blockers.push({ code: "source_missing" });
	if (document.targets.length === 0) blockers.push({ code: "no_targets" });
	const approved = request.approved_revision === request.revision;
	const allowed = getAllowedTargets({
		collection: state.collection,
		type: request.type,
		source: document.source,
	});
	for (const target of document.targets) {
		if (!allowed.includes(target.target)) {
			blockers.push({ code: "target_unavailable", target: target.target });
			continue;
		}

		const currentVersionId = state.versions.get(target.target)?.id ?? null;
		const review = getTargetReview({
			target,
			requestDocumentId: document.id,
			events: request.events,
			currentVersionId,
		});
		if (approved && target.approved_version_id !== currentVersionId) {
			blockers.push({ code: "target_changed", target: target.target });
		} else if (!approved && review.changedSinceCreation && !review.reviewed) {
			blockers.push({ code: "review_required", target: target.target });
		}

		//* create requests target latest, which stages list to allow them
		if (
			state.workflowStage !== null &&
			!workflowStageAllowsTarget({
				collection: state.collection,
				stageKey: state.workflowStage,
				target: target.target,
			})
		) {
			blockers.push({ code: "workflow", target: target.target });
		}

		const config = state.collection.getData.publishing.targets.find(
			(environment) => environment.key === target.target,
		);
		for (const required of config?.requires ?? []) {
			const requestdFirst =
				document.targets.some((other) => other.target === required) &&
				allowed.indexOf(required) < allowed.indexOf(target.target);
			const holdsContent =
				state.request !== null &&
				state.versions.get(required)?.contentId === state.request.contentId;
			if (!requestdFirst && !holdsContent) {
				blockers.push({
					code: "prerequisite",
					target: target.target,
					required,
				});
			}
		}
	}

	if (
		request.scheduled_at !== null &&
		(!context.queue.support.delayedDelivery ||
			state.collection.getData.publishing.scheduling !== true)
	) {
		blockers.push({ code: "scheduling_unavailable" });
	}

	return blockers;
};

export default getDocumentBlockers;
