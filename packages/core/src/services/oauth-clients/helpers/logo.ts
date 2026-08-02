import type { OAuthClientLogoInput } from "../../../schemas/oauth-clients.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import createMedia from "../../media/create-single.js";
import updateMedia from "../../media/update-single.js";

export const createOAuthClientLogo = async (
	context: ServiceContext,
	input: OAuthClientLogoInput,
	userId: number,
): ServiceResponse<number> => {
	const createRes = await createMedia(context, {
		key: input.key,
		fileName: input.fileName,
		width: input.width,
		height: input.height,
		blurHash: input.blurHash,
		averageColor: input.averageColor,
		base64: input.base64,
		isDark: input.isDark,
		isLight: input.isLight,
		title: [],
		alt: [],
		folderId: null,
		isHidden: true,
		origin: "human",
		allowedType: "image",
		userId,
	});
	if (createRes.error) return createRes;

	return {
		error: undefined,
		data: createRes.data.id,
	};
};

export const updateOAuthClientLogo = async (
	context: ServiceContext,
	id: number,
	input: OAuthClientLogoInput,
	userId: number,
): ServiceResponse<undefined> => {
	const updateRes = await updateMedia(context, {
		id,
		key: input.key,
		fileName: input.fileName,
		public: true,
		folderId: null,
		width: input.width,
		height: input.height,
		blurHash: input.blurHash,
		averageColor: input.averageColor,
		base64: input.base64,
		isDark: input.isDark,
		isLight: input.isLight,
		origin: "human",
		allowedType: "image",
		userId,
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};
