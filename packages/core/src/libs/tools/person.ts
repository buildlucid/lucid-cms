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

/** A user in tool output, eg. from users_find or a document's refs. */
export const userSchema = personSchema.extend({
	username: z.string(),
	profilePicture: z
		.string()
		.nullable()
		.meta({ description: "Profile picture URL." }),
});

/** Keeps a user to what tools need, leaving out their email. */
export const formatUser = (
	user: RequestUser & { username: string },
): z.output<typeof userSchema> => ({
	...formatPerson(user),
	username: user.username,
	profilePicture: user.profilePicture?.url ?? null,
});
