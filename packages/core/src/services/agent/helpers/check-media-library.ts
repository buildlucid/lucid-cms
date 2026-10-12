import { copy } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Resolves library storage and checks create permission before generation, always using the library for system runs.
 */
const checkMediaLibrary: ServiceFn<
	[{ library: boolean; execution: AgentToolExecution }],
	boolean
> = async (_context, props) => {
	const { principal } = props.execution.authority;
	const library = props.library || principal.type === "system";
	if (
		library &&
		principal.type === "user" &&
		!hasPermission(props.execution.authority, Permissions.MediaCreate)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.media.generate.library.denied"),
			},
		};
	}

	return { error: undefined, data: library };
};

export default checkMediaLibrary;
