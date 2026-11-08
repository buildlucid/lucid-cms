import z from "zod";

export const inputSchema = z.object({
	subagentId: z.uuid().optional().meta({
		description: "Leave out to list this chat's sub-agents and their status.",
	}),
	view: z.enum(["messages", "references"]).default("messages").meta({
		description:
			"messages reads its chat; references lists the media, documents and requests linked to it.",
	}),
	messageId: z.uuid().optional().meta({
		description:
			"With messages, returns this message in character pages instead of the list.",
	}),
	after: z.number().int().nonnegative().default(0).meta({
		description: "With messages, lists messages after this position.",
	}),
	offset: z.number().int().nonnegative().default(0).meta({
		description:
			"Where to continue a message's characters, or the references list.",
	}),
});

//* the same shapes lucid_read_history and lucid_list_references return, or a list of sub-agents; tools need an object schema, so it can't be a union
export const outputSchema = z.looseObject({});
