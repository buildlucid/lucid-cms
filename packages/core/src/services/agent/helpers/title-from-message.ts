import constants from "../../../constants/constants.js";

/** Uses the first line of the opening message as the conversation title. */
const titleFromMessage = (text: string) => {
	const line = text.trim().split("\n")[0] ?? "";

	return line.length > constants.agent.titleLength
		? `${line.slice(0, constants.agent.titleLength - 1).trimEnd()}…`
		: line;
};

export default titleFromMessage;
