import type {
	Media,
	MediaCropInput,
	MediaImageMeta,
	ResponseBody,
} from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	key?: string;
	fileName?: string;
	width?: number;
	height?: number;
	focalPoint?: MediaImageMeta["focalPoint"];
	blurHash?: string;
	averageColor?: string;
	base64?: string | null;
	isDark?: boolean;
	isLight?: boolean;
	origin?: Media["origin"];
	aiGenerationRequestId?: string;
	title?: {
		localeCode: string | null;
		value: string | null;
	}[];
	alt?: {
		localeCode: string | null;
		value: string | null;
	}[];
	crop?: MediaCropInput | null;
}

export const updateProfilePictureReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/account/profile-picture",
		csrf: true,
		method: "POST",
		body: params,
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
			title: T()("toasts.common.profile.picture.update.title"),
			message: T()("toasts.common.profile.picture.update.message"),
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

export default useUpdateProfilePicture;
