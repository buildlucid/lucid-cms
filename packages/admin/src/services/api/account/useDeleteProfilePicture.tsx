import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<never, never>;

export const deleteProfilePictureReq = (_params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/account/profile-picture",
		csrf: true,
		config: {
			method: "DELETE",
		},
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
			title: T()("profile_picture_delete_toast_title"),
			message: T()("profile_picture_delete_toast_message"),
		}),
		invalidates: [
			"users.getMultiple",
			"users.getSingle",
			"documents.getMultiple",
			"documents.getSingle",
		],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useDeleteProfilePicture;
