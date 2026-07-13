import type { Media, MediaCropInput, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
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
		origin?: Media["origin"];
		aiGenerationRequestId?: string;
		folderId?: number | null;
		width?: number | null;
		height?: number | null;
		focalPoint?: Media["meta"]["focalPoint"];
		blurHash?: string | null;
		averageColor?: string | null;
		base64?: string | null;
		isDark?: boolean | null;
		isLight?: boolean | null;
		isDeleted?: boolean | null;
		public?: boolean;
		posterId?: number | null;
		crop?: MediaCropInput | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/${params.id}`,
		csrf: true,
		config: {
			method: "PATCH",
			body: params.body,
		},
	});
};

interface UseUpdateSingleProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()("toasts.media.update.title"),
			message: T()("toasts.media.update.message"),
		}),
		invalidates: [
			"media.getMultiple",
			"media.getSingle",
			"mediaFolders.getMultiple",
			"mediaFolders.getHierarchy",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSingle;
