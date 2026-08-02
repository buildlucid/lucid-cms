import type { ServiceFn } from "../../../utils/services/types.js";
import abortUploadSession from "../abort-upload-session.js";

const abortUploadSessionJob: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	undefined
> = async (context, data) => {
	return abortUploadSession(context, {
		sessionId: data.sessionId,
	});
};

export default abortUploadSessionJob;
