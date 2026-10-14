import type {
	AgentReferenceSnapshot,
	AgentScreen,
} from "../../types/response.js";
import { routineEventsIntro, routineRequest } from "./instructions/messages.js";
import type { StoredAgentMessagePart } from "./messages.js";

/** Keeps attached resources, and the admin screen it was sent from, alongside the message that introduced them. */
export const inputMessageParts = (input: {
	text: string;
	references?: AgentReferenceSnapshot[];
	screen?: AgentScreen | null;
}): StoredAgentMessagePart[] => [
	...(input.text ? [{ type: "text" as const, text: input.text }] : []),
	...(input.references ?? []).map((reference) => ({
		type: "reference" as const,
		reference,
	})),
	...(input.screen ? [{ type: "screen" as const, screen: input.screen }] : []),
];

const escapeAttribute = (value: string | number) =>
	String(value)
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;");

const attachmentAttributes = (reference: AgentReferenceSnapshot) => {
	switch (reference.type) {
		case "media":
			return {
				type: "media",
				media_id: reference.mediaId,
				name: reference.label,
				mime_type: reference.mimeType,
			};
		case "document":
			return {
				type: "document",
				collection_key: reference.collectionKey,
				document_id: reference.documentId,
				version_id: reference.versionId,
				name: reference.label,
			};
		case "request":
			return {
				type: "request",
				request_id: reference.requestId,
				name: reference.label,
			};
	}
};

/** Labels come from CMS content, so they stay quoted attribute values rather than message text. */
const contextTag = (
	name: string,
	attributes: Record<string, string | number | undefined>,
) =>
	`<${name} ${Object.entries(attributes)
		.flatMap(([key, value]) =>
			value === undefined ? [] : [`${key}="${escapeAttribute(value)}"`],
		)
		.join(" ")} />`;

/** Formats local date and time, such as "Wednesday, 14 October 2026 at 10:12". */
const localTime = (sentAt: string, timezone: string) => {
	try {
		return new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			dateStyle: "full",
			timeStyle: "short",
		}).format(new Date(sentAt));
	} catch {
		return undefined;
	}
};

export const textFromParts = (parts: StoredAgentMessagePart[]) =>
	parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");

const screenAttributes = (screen: AgentScreen) => {
	switch (screen.type) {
		case "document":
			return {
				type: "document_builder",
				collection_key: screen.collectionKey,
				document_id: screen.documentId ?? undefined,
				request_id: screen.requestId ?? undefined,
				name: screen.label,
			};
		case "request":
			return {
				type: "request",
				request_id: screen.requestId,
				name: screen.label,
			};
		case "documents":
			return {
				type: "document_list",
				collection_key: screen.collectionKey,
				content_locale: screen.contentLocale ?? undefined,
				filter: screen.filter ?? undefined,
				name: screen.label,
			};
		case "media":
			return {
				type: "media_library",
				folder_id: screen.folderId ?? undefined,
				filter: screen.filter ?? undefined,
				name: screen.label,
			};
		case "requests":
			return {
				type: "request_list",
				filter: screen.filter ?? undefined,
				name: screen.label,
			};
		case "review":
			return { type: "review_overview", name: screen.label };
		case "history":
			return {
				type: "document_history",
				collection_key: screen.collectionKey,
				document_id: screen.documentId,
				version_id: screen.versionId ?? undefined,
				name: screen.label,
			};
	}
};

/** Formats message text, attached resource labels and its originating admin screen for the model without fetching resource contents. */
export const messageText = (parts: StoredAgentMessagePart[]) => {
	const routine = parts.find((part) => part.type === "routine");
	let text = textFromParts(parts);
	//* framed as the routine's standing task, so wording like "every morning" is not read as a request to schedule it.
	//* A routine run only repeats its instructions when they changed, see routineRequestParts
	if (routine) {
		text = routineRequest(routine.name, text);
	}
	if (routine?.events?.length) {
		const changes = routine.events.map((change) =>
			contextTag("change", {
				events: change.events.join(" "),
				changed: change.fields?.join(" "),
				...attachmentAttributes(change.reference),
			}),
		);
		text = `${text}\n\n${routineEventsIntro}\n<routine_events>\n${changes.join("\n")}\n</routine_events>`;
	}

	const references = parts.flatMap((part) =>
		part.type === "reference" ? [part.reference] : [],
	);
	if (references.length) {
		text = `${text}\n\n<attachments>\n${references.map((reference) => contextTag("attachment", attachmentAttributes(reference))).join("\n")}\n</attachments>`;
	}

	const screen = parts.find((part) => part.type === "screen");
	if (screen) {
		text = `${text}\n\n${contextTag("current_screen", screenAttributes(screen.screen))}`;
	}

	const sent = parts.find((part) => part.type === "context");
	if (sent) {
		text = `${text}\n\n${contextTag("message_context", {
			sent_at: sent.sentAt,
			local_time: localTime(sent.sentAt, sent.timezone),
			timezone: sent.timezone,
			acting_for: sent.actingFor?.name ?? "system",
			acting_for_user_id: sent.actingFor?.userId,
		})}`;
	}

	return text.trim();
};
