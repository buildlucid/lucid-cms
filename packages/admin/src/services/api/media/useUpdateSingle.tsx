import T, { type TranslationKeys } from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

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
		folderId?: number | null;
		width?: number | null;
		height?: number | null;
		blurHash?: string | null;
		averageColor?: string | null;
		isDark?: boolean | null;
		isLight?: boolean | null;
		isDeleted?: boolean | null;
	};
}

export const updateSingleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/media/${params.id}`,
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
	toast?: {
		title?: TranslationKeys;
		message?: TranslationKeys;
	};
}

const useUpdateSingle = (props?: UseUpdateSingleProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateSingleReq,
		getSuccessToast: () => ({
			title: T()(props?.toast?.title ?? "media_update_toast_title"),
			message: T()(props?.toast?.message ?? "media_update_toast_message"),
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
