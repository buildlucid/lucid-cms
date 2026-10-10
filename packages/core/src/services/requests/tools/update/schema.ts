import z from "zod";
import {
	requestStatusSchema,
	requestTypeSchema,
} from "../../../../libs/db/tables/requests.js";
import { htmlInput, requestIdInput, requestLinksSchema } from "../schema.js";

const documentShape = {
	collectionKey: z.string().min(1),
	documentId: z.number().int().positive(),
};
const targetsInput = z.array(z.string().min(1)).meta({
	description:
		"See allowedTargets in requests_get. Publish requests from latest can also target latest, which completing replaces with the proposal. Unpublish requests take environments. Delete requests take none.",
});

export const changeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("title"),
		title: z.string().trim().min(1).max(200),
	}),
	z.object({
		type: z.literal("description"),
		description: htmlInput.nullable().meta({
			description: "Why the change is needed, as HTML. Null removes it.",
		}),
	}),
	z.object({
		type: z.literal("reviewers"),
		reviewerIds: z.array(z.number().int().positive()).meta({
			description:
				"Replaces the people asked to review. Find people who can approve it with users_find and {key:'canReview',value:requestId}.",
		}),
	}),
	z.object({
		type: z.literal("status"),
		status: requestStatusSchema.exclude(["completed"]).meta({
			description:
				"closed stops the request without completing it, open reopens it.",
		}),
	}),
	z.object({
		type: z.literal("addDocument"),
		...documentShape,
		targets: targetsInput,
		source: z.string().min(1).optional().meta({
			description:
				"Publish requests only: latest or an environment to publish from. Defaults to latest.",
		}),
	}),
	z.object({
		type: z.literal("setTargets"),
		...documentShape,
		targets: targetsInput,
	}),
	z.object({ type: z.literal("removeDocument"), ...documentShape }),
]);

export const inputSchema = z.object({
	requestId: requestIdInput,
	changes: z.array(changeSchema).min(1).meta({
		description:
			"Only the changes to make, eg. [{type:'title',title:'Spring launch'}]. Create requests keep their one document. Document and target changes withdraw approvals.",
	}),
});

export const outputSchema = z.object({
	request: z.object({
		id: z.number(),
		type: requestTypeSchema,
		status: requestStatusSchema,
	}),
	links: requestLinksSchema,
});
