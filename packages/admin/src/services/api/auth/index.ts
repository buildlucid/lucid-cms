import useAcceptInvitation from "./useAcceptInvitation";
import useAcceptInvitationPasskey from "./useAcceptInvitationPasskey";
import useConfirmTwoFactorChallenge from "./useConfirmTwoFactorChallenge";
import useConfirmTwoFactorPasskey from "./useConfirmTwoFactorPasskey";
import useCsrf from "./useCsrf";
import useGetProviders from "./useGetProviders";
import useGetTwoFactorChallenge from "./useGetTwoFactorChallenge";
import useInitiateProvider from "./useInitiateProvider";
import useLogin from "./useLogin";
import useLogout from "./useLogout";
import useMagicLinkLogin from "./useMagicLinkLogin";
import usePasskeyLogin from "./usePasskeyLogin";
import useSendMagicLink from "./useSendMagicLink";
import useSetup from "./useSetup";
import useSetupRequired from "./useSetupRequired";
import useSetupTwoFactorChallenge from "./useSetupTwoFactorChallenge";
import useValidateInvitation from "./useValidateInvitation";
import useValidateMagicLink from "./useValidateMagicLink";
import useVerifyTwoFactor from "./useVerifyTwoFactor";
import useVerifyTwoFactorPasskey from "./useVerifyTwoFactorPasskey";

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
	usePasskeyLogin,
	useGetTwoFactorChallenge,
	useVerifyTwoFactor,
	useSetupTwoFactorChallenge,
	useConfirmTwoFactorChallenge,
	useVerifyTwoFactorPasskey,
	useConfirmTwoFactorPasskey,
	useAcceptInvitationPasskey,
};
export default exportObject;
