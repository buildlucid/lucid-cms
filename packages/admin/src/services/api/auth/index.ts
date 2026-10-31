import useAcceptInvitation from "./useAcceptInvitation";
import useConfirmTwoFactorChallenge from "./useConfirmTwoFactorChallenge";
import useCsrf from "./useCsrf";
import useGetProviders from "./useGetProviders";
import useGetTwoFactorChallenge from "./useGetTwoFactorChallenge";
import useInitiateProvider from "./useInitiateProvider";
import useLogin from "./useLogin";
import useLogout from "./useLogout";
import useMagicLinkLogin from "./useMagicLinkLogin";
import useSendMagicLink from "./useSendMagicLink";
import useSetup from "./useSetup";
import useSetupRequired from "./useSetupRequired";
import useSetupTwoFactorChallenge from "./useSetupTwoFactorChallenge";
import useValidateInvitation from "./useValidateInvitation";
import useValidateMagicLink from "./useValidateMagicLink";
import useVerifyTwoFactor from "./useVerifyTwoFactor";

const exportObject = {
	useLogin,
	useCsrf,
	useLogout,
	useSetupRequired,
	useSetup,
	useValidateInvitation,
	useGetProviders,
	useInitiateProvider,
	useAcceptInvitation,
	useSendMagicLink,
	useMagicLinkLogin,
	useValidateMagicLink,
	useGetTwoFactorChallenge,
	useVerifyTwoFactor,
	useSetupTwoFactorChallenge,
	useConfirmTwoFactorChallenge,
};
export default exportObject;
