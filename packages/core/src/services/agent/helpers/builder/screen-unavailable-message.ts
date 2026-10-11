import { copy } from "../../../../libs/i18n/index.js";
import type { ScreenResponse } from "./screen-call.js";

/** Explains an unavailable screen to the model so it can adjust its next call. */
const screenUnavailableMessage = (
	response: Extract<ScreenResponse, { status: "unavailable" }>,
) => {
	switch (response.reason) {
		case "moved":
			return response.screen
				? copy("server:agent.screen.unavailable.moved.to", {
						data: { name: response.screen.label },
					})
				: copy("server:agent.screen.unavailable.moved");
		case "closed":
			return copy("server:agent.screen.unavailable.closed");
		case "locked":
			return copy("server:agent.screen.unavailable.locked");
		case "changed":
			return copy("server:agent.screen.unavailable.changed");
		case "missing":
			return copy("server:agent.screen.unavailable.missing");
	}
};

export default screenUnavailableMessage;
