import type { MediaResponse, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	key?: string;
	fileName?: string;
	title: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	alt: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	folderId?: number | null;
	width?: number;
	height?: number;
	blurHash?: string;
	averageColor?: string;
	isDark?: boolean;
	isLight?: boolean;
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<MediaResponse>>({
		url: "/lucid/api/v1/media",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: (_data: ResponseBody<MediaResponse>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<MediaResponse>>(
		{
			mutationFn: createSingleReq,
			invalidates: ["media.getMultiple", "mediaFolders.getMultiple"],
			onSuccess: props?.onSuccess,
			onError: props?.onError,
		},
	);
};

export default useCreateSingle;
