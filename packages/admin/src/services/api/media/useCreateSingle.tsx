import type { Media, ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	key?: string;
	fileName?: string;
	title?: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	alt?: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	description?: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	summary?: Array<{
		localeCode: string | null;
		value: string | null;
	}>;
	folderId?: number | null;
	posterId?: number | null;
	isHidden?: boolean;
	width?: number;
	height?: number;
	focalPoint?: Media["meta"]["focalPoint"];
	blurHash?: string;
	averageColor?: string;
	base64?: string | null;
	isDark?: boolean;
	isLight?: boolean;
}

export const createSingleReq = (params: Params) => {
	return request<ResponseBody<Media>>({
		url: "/lucid/api/v1/media",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseCreateSingleProps {
	onSuccess?: (_data: ResponseBody<Media>) => void;
	onError?: () => void;
}

const useCreateSingle = (props?: UseCreateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<Media>>({
		mutationFn: createSingleReq,
		invalidates: ["media.getMultiple", "mediaFolders.getMultiple"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useCreateSingle;
