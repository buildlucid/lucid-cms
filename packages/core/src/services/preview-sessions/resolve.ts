import { previewSessionsFormatter } from "../../libs/formatters/index.js";
import type { PreviewSession } from "../../types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveSession from "./helpers/resolve-session.js";

const resolve: ServiceFn<[{ token: string }], PreviewSession> = async (
	context,
	data,
) => {
	const sessionRes = await resolveSession(context, data);
	if (sessionRes.error) return sessionRes;

	return {
		error: undefined,
		data: previewSessionsFormatter.formatSingle({
			session: sessionRes.data,
		}),
	};
};

export default resolve;
