import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices } from "../../index.js";

const abortUploadSessionJob: ServiceFn<
	[
		{
			sessionId: string;
		},
	],
	undefined
> = async (context, data) => {
	return mediaServices.abortUploadSession(context, {
		sessionId: data.sessionId,
	});
};

export default abortUploadSessionJob;
