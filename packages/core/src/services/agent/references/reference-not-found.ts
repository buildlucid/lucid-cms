import { copy } from "../../../libs/i18n/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";

const referenceNotFound = (reference: AgentReferenceInput) => {
	switch (reference.type) {
		case "media":
			return copy("server:core.media.not.found.message");
		case "document":
			return copy("server:core.documents.not.found.message");
		case "request":
			return copy("server:core.requests.not.found");
	}
};

export default referenceNotFound;
