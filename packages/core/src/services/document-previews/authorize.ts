import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolve from "./resolve.js";

const authorize: ServiceFn<
	[
		{
			token: string;
			collectionKey: string;
			versionType: string;
			versionId?: number;
		},
	],
	{ documentId: number }
> = async (context, data) => {
	const previewRes = await resolve(context, { token: data.token });
	if (previewRes.error) return previewRes;

	const preview = previewRes.data;
	if (
		preview.collectionKey !== data.collectionKey ||
		preview.versionType !== data.versionType ||
		(preview.versionId ?? undefined) !== data.versionId
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.token.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { documentId: preview.documentId },
	};
};

export default authorize;
