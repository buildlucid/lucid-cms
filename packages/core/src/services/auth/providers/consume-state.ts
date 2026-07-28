import { copy } from "../../../libs/i18n/index.js";
import { AuthStatesRepository } from "../../../libs/repositories/index.js";
import type { AuthStateActionType } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

export type ConsumedProviderState = {
	id: number;
	invitationTokenId: number | null;
	redirectPath: string | null;
	actionType: AuthStateActionType;
	authenticatedUserId: number | null;
	codeVerifier: string;
	nonce: string | null;
};

/**
 * Atomically consumes and formats a provider authentication state.
 */
const consumeState: ServiceFn<
	[{ providerKey: string; state: string }],
	ConsumedProviderState
> = async (context, input) => {
	const AuthStates = new AuthStatesRepository(
		context.db.client,
		context.config.db,
	);
	const result = await AuthStates.consume({
		state: input.state,
		providerKey: input.providerKey,
		consumedAt: new Date().toISOString(),
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
				message: copy("server:core.invalid.or.expired.state.message"),
			},
		},
	});
	if (result.error) return result;

	return {
		error: undefined,
		data: {
			id: result.data.id,
			invitationTokenId: result.data.invitation_token_id,
			redirectPath: result.data.redirect_path,
			actionType: result.data.action_type,
			authenticatedUserId: result.data.authenticated_user_id,
			codeVerifier: result.data.code_verifier,
			nonce: result.data.nonce,
		},
	};
};

export default consumeState;
