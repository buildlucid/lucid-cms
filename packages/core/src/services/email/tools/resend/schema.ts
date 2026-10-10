import z from "zod";
import { emailIdInput } from "../schema.js";

export const inputSchema = z.object({ emailId: emailIdInput });

export const outputSchema = z.object({
	job: z.object({ id: z.string() }).meta({
		description:
			"The queued send. Read the email again to see how delivery went.",
	}),
});
