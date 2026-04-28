import type { Media, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	userId: number;
	body: {
		key?: string;
		fileName?: string;
		width?: number;
		height?: number;
		focalPoint?: Media["meta"]["focalPoint"];
		blurHash?: string;
		averageColor?: string;
		base64?: string | null;
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
	};
}

export const updateProfilePictureReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/users/${params.userId}/profile-picture`,
		csrf: true,
		config: {
			method: "POST",
			body: params.body,
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
