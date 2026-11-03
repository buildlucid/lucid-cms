import { copy } from "../../libs/i18n/index.js";
import systemActor from "../../libs/permission/system-actor.js";
import type { Deploy } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getMultiple from "./get-multiple.js";

/** Returns one configured deploy with its current state, for code that acts as the system. */
const getSingle: ServiceFn<[{ key: string }], Deploy> = async (
	context,
	data,
) => {
	const deploys = await getMultiple(context, { actor: systemActor });
	if (deploys.error) return deploys;

	const deploy = deploys.data.find((item) => item.key === data.key);
	if (!deploy) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.not.found", {
					data: { deploy: data.key },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: deploy };
};

export default getSingle;
