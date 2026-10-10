import type z from "zod";
import type CollectionBuilder from "../../../../libs/collection/builders/collection-builder/index.js";
import describeErrorDetails from "../../../../libs/tools/describe-error-details.js";
import type { agentBuilderContentSchema } from "../../../../schemas/agent-screen.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import checkValidateBricksFields from "../../../documents-bricks/checks/check-validate-bricks-fields.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import type { RunnerToolCall } from "./types.js";

/**
 * Returns builder validation errors as shown on save, identifying bricks by ref or by key for fixed bricks.
 *
 * @example "bricks.Xy12ab.heading (en): Please enter a value for this field"
 */
const builderValidation = async (
	context: ServiceContext,
	props: {
		call: RunnerToolCall;
		collection: CollectionBuilder;
		content: z.output<typeof agentBuilderContentSchema>;
		documentId: number | null;
		versionId: number | null;
	},
): Promise<string[]> => {
	const user =
		props.call.run.user_id === null
			? undefined
			: await resolveActorUser(context, {
					actor: {
						kind: "user",
						userId: props.call.run.user_id,
						agentRunId: props.call.run.id,
					},
				});

	const checked = await checkValidateBricksFields(context, {
		collection: props.collection,
		bricks: props.content.bricks,
		fields: props.content.fields,
		authUser: user?.data,
		existingVersion:
			props.documentId !== null && props.versionId !== null
				? { id: props.versionId, documentId: props.documentId }
				: undefined,
	});
	if (!checked.error) return [];

	const fixed = new Set(
		props.content.bricks.flatMap((brick) =>
			brick.type === "fixed" ? [brick.ref] : [],
		),
	);
	const lines = describeErrorDetails(context, checked.error, (brick) =>
		fixed.has(brick.ref) ? `bricks.${brick.key}` : `bricks.${brick.ref}`,
	);
	return lines.length
		? lines
		: [context.translate(checked.error.message) ?? ""].filter(Boolean);
};

export default builderValidation;
