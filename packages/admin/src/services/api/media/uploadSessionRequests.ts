import type {
	ResponseBody,
	UploadSessionPart,
	UploadSessionStateResponse,
} from "@types";
import request from "@/utils/request";

export const getUploadSessionReq = (sessionId: string) => {
	return request<ResponseBody<UploadSessionStateResponse>>({
		url: `/lucid/api/v1/media/upload-session/${sessionId}`,
		csrf: true,
		config: {
			method: "GET",
		},
	});
};

export const getUploadPartUrlsReq = (params: {
	sessionId: string;
	partNumbers: number[];
}) => {
	return request<
		ResponseBody<{
			parts: Array<{
				partNumber: number;
				url: string;
				headers?: Record<string, string>;
			}>;
		}>
	>({
		url: `/lucid/api/v1/media/upload-session/${params.sessionId}/parts`,
		csrf: true,
		config: {
			method: "POST",
			body: {
				partNumbers: params.partNumbers,
			},
		},
	});
};

export const completeUploadSessionReq = (params: {
	sessionId: string;
	parts: UploadSessionPart[];
}) => {
	return request<ResponseBody<{ key: string }>>({
		url: `/lucid/api/v1/media/upload-session/${params.sessionId}/complete`,
		csrf: true,
		config: {
			method: "POST",
			body: {
				parts: params.parts,
			},
		},
	});
};

export const abortUploadSessionReq = (sessionId: string) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/media/upload-session/${sessionId}`,
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};
