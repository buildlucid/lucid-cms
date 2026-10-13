import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";

/** Checks whether a change requires an approved request, using the environment for publishing and unpublishing. */
const requiresReview = (
	collection: CollectionBuilder | undefined,
	change:
		| { type: "create" | "delete" }
		| { type: "publish" | "unpublish"; environment: string },
): boolean => {
	const review = collection?.getData.publishing.review;
	if (!review) return false;
	if (!("environment" in change)) return review[change.type];

	return review[change.type].includes(change.environment);
};

export default requiresReview;
