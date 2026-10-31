import { copy } from "../../libs/i18n/index.js";
import { UserPasskeysRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const renamePasskey: ServiceFn<
	[
		{
			userId: number;
			passkeyId: number;
			name: string;
		},
	],
	undefined
> = async (context, data) => {
	const Passkeys = new UserPasskeysRepository(context.db);

	const updateRes = await Passkeys.updateSingle({
		data: {
			name: data.name,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.passkeyId,
			},
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: copy("server:core.auth.passkeys.not.found.message"),
			},
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default renamePasskey;
