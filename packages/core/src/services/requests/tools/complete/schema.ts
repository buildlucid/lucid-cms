import z from "zod";
import { requestIdInput, requestLinksSchema } from "../schema.js";

export const inputSchema = z.object({ requestId: requestIdInput });

export const outputSchema = z.object({
	job: z.object({ id: z.string() }).meta({
		description:
			"The queued completion. Read the request again to see when it has finished.",
	}),
	links: requestLinksSchema,
});
