import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: {
		public: boolean;
		folderId?: number | null;
	};
}

export const addToLibraryReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/lucid/api/v1/media/${params.id}/add-to-library`,
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

interface UseAddToLibraryProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useAddToLibrary = (props?: UseAddToLibraryProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: addToLibraryReq,
		getSuccessToast: () => ({
			title: T()("toasts.media.library.added.title"),
			message: T()("toasts.media.library.added.message"),
		}),
		invalidates: [
			queryKeys.media.all(),
			queryKeys.mediaFolders.list(),
			queryKeys.mediaFolders.hierarchy(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useAddToLibrary;
