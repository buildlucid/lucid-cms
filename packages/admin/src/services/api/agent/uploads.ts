import type { Media, ResponseBody, UploadSessionResponse } from "@types";
import request from "@/utils/request";

export const createUploadSessionReq = (props: {
	agentKey: string;
	fileName: string;
	mimeType: string;
	size: number;
}) =>
	request<ResponseBody<UploadSessionResponse>>({
		url: "/lucid/api/v1/agent/uploads/session",
		method: "POST",
		body: props,
	});

export const createUploadReq = (props: {
	agentKey: string;
	key: string;
	fileName: string;
	signal?: AbortSignal;
}) =>
	request<ResponseBody<Media>>({
		url: "/lucid/api/v1/agent/uploads",
		method: "POST",
		signal: props.signal,
		body: {
			agentKey: props.agentKey,
			key: props.key,
			fileName: props.fileName,
		},
	});
