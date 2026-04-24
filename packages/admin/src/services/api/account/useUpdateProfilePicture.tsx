import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	key?: string;
	fileName?: string;
	width?: number;
	height?: number;
	blurHash?: string;
	averageColor?: string;
	isDark?: boolean;
	isLight?: boolean;
	title?: {
		localeCode: string;
		value: string | null;
	}[];
	alt?: {
		localeCode: string;
		value: string | null;
	}[];
}

export const updateProfilePictureReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/account/profile-picture",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseUpdateProfilePictureProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateProfilePicture = (props?: UseUpdateProfilePictureProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateProfilePictureReq,
		getSuccessToast: () => ({
			title: T()("profile_picture_update_toast_title"),
			message: T()("profile_picture_update_toast_message"),
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

export default useUpdateProfilePicture;
