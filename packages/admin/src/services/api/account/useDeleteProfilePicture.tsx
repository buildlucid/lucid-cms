import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<never, never>;

export const deleteProfilePictureReq = (_params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/account/profile-picture",
		csrf: true,
		method: "DELETE",
	});
};

interface UseDeleteProfilePictureProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useDeleteProfilePicture = (props?: UseDeleteProfilePictureProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: deleteProfilePictureReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.profile.picture.delete.title"),
			message: T()("toasts.common.profile.picture.delete.message"),
		}),
		invalidates: [
			queryKeys.account.all(),
			queryKeys.users.list(),
			queryKeys.users.detail(),
			queryKeys.documents.all(),
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteProfilePicture;
