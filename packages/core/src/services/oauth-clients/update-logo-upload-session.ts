import type { UploadSessionResponse } from "@lucidcms/types";
import { OAuthClientsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import createLogoUploadSession from "./create-logo-upload-session.js";

const updateLogoUploadSession: ServiceFn<
	[
		{
			id: number;
			fileName: string;
			mimeType: string;
			size: number;
			userId: number;
		},
	],
	UploadSessionResponse
> = async (context, data) => {
	const OAuthClients = new OAuthClientsRepository(
		context.db.client,
		context.config.db,
	);

	const clientRes = await OAuthClients.selectSingle({
		select: ["id"],
		where: [{ key: "id", operator: "=", value: data.id }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
			},
		},
	});
	if (clientRes.error) return clientRes;

	return createLogoUploadSession(context, data);
};

export default updateLogoUploadSession;
