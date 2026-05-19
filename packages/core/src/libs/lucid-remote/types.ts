import type { ResponseBody } from "../../types/response.js";

export type VerifyCmsLicenseData = {
	valid: boolean;
	message?: string;
	ai?: {
		enabled?: boolean;
	};
};

export type LucidRemoteRequestData<T> = {
	response: Response;
	json: ResponseBody<T>;
};
