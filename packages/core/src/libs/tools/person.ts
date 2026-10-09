import z from "zod";
import type { RequestUser } from "../../types/response.js";

/** A person in tool output, named as the admin shows them. */
export const personSchema = z.object({ id: z.number(), name: z.string() });

/** The agent that acted for the person next to it. Tool output pairs every person field with one, eg. `createdBy` and `createdByAgent`. */
export const agentNameSchema = z.string().nullable().meta({
	description: "The agent that did it for the person, if any.",
});

export const formatPerson = (
	user: RequestUser,
): z.output<typeof personSchema> => ({
	id: user.id,
	name:
		[user.firstName, user.lastName].filter(Boolean).join(" ") ||
		user.username ||
		user.email ||
		`#${user.id}`,
});
