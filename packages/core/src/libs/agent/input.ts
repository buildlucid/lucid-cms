import type { StoredAgentMessagePart } from "../../schemas/agent.js";
import type { AgentReferenceSnapshot } from "../../types/response.js";
import { routineRequest } from "./instructions/messages.js";

/** Keeps attached resources alongside the message that introduced them. */
export const inputMessageParts = (input: {
	text: string;
	references?: AgentReferenceSnapshot[];
}): StoredAgentMessagePart[] => [
	...(input.text ? [{ type: "text" as const, text: input.text }] : []),
	...(input.references ?? []).map((reference) => ({
		type: "reference" as const,
		reference,
	})),
];

const escapeAttribute = (value: string | number) =>
	String(value)
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;");

/** Labels come from CMS content, so they stay quoted attribute values rather than message text. */
const attachmentTag = (reference: AgentReferenceSnapshot) => {
	const attributes =
		reference.type === "media"
			? {
					type: "media",
					media_id: reference.mediaId,
					name: reference.label,
					mime_type: reference.mimeType,
				}
			: {
					type: "document",
					collection_key: reference.collectionKey,
					document_id: reference.documentId,
					version_id: reference.versionId,
					name: reference.label,
				};

	return `<attachment ${Object.entries(attributes)
		.flatMap(([key, value]) =>
			value === undefined ? [] : [`${key}="${escapeAttribute(value)}"`],
		)
		.join(" ")} />`;
};

export const textFromParts = (parts: StoredAgentMessagePart[]) =>
	parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");

/** A message as the model sees it: its text, then the resources attached to it. Contents are never fetched. */
export const messageText = (parts: StoredAgentMessagePart[]) => {
	const routine = parts.find((part) => part.type === "routine");
	let text = textFromParts(parts);
	//* framed as the routine's standing task, so wording like "every morning" is not read as a request to schedule it.
	//* A routine run only repeats its instructions when they changed, see routineRequestParts
	if (routine) {
		text = routineRequest(routine.name, text);
	}

	const references = parts.flatMap((part) =>
		part.type === "reference" ? [part.reference] : [],
	);
	if (!references.length) return text;

	return `${text}\n\n<attachments>\n${references.map(attachmentTag).join("\n")}\n</attachments>`.trim();
};
