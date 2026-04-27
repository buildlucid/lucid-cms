import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type UploadSessionPart = {
	partNumber: number;
	etag: string;
	size?: number;
};

export type UploadSessionResponse =
	| {
			mode: "single";
			key: string;
			url: string;
			headers?: Record<string, string>;
	  }
	| {
			mode: "resumable";
			key: string;
			sessionId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: UploadSessionPart[];
	  };

interface Params {
	body: {
		fileName: string;
		mimeType: string;
		size: number;
		public: boolean;
		temporary?: boolean;
	};
}

export const createUploadSessionReq = (params: Params) => {
	return request<ResponseBody<UploadSessionResponse>>({
		url: "/lucid/api/v1/media/upload-session",
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
		},
	});
};

interface UseCreateUploadSessionProps {
	onSuccess?: (_data: ResponseBody<UploadSessionResponse>) => void;
	onError?: () => void;
}

const useCreateUploadSession = (props?: UseCreateUploadSessionProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<UploadSessionResponse>
	>({
		mutationFn: createUploadSessionReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateUploadSession;
