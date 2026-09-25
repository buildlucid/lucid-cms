import type { AgentMessagePart } from "../../../types/response.js";

/** Joins visible model text without including tool output or widget data. */
const textFromParts = (parts: AgentMessagePart[]) =>
	parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("");

export default textFromParts;
