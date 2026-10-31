import integrations from "./integrations";
import useCancelEmailChange from "./useCancelEmailChange";
import useConfirmEmailChange from "./useConfirmEmailChange";
import useConfirmTwoFactor from "./useConfirmTwoFactor";
import useCreateProfilePictureUploadSession from "./useCreateProfilePictureUploadSession";
import useDeleteProfilePicture from "./useDeleteProfilePicture";
import useDisableTwoFactor from "./useDisableTwoFactor";
import useForgotPassword from "./useForgotPassword";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useRegenerateRecoveryCodes from "./useRegenerateRecoveryCodes";
import useResetPassword from "./useResetPassword";
import useRevertEmailChange from "./useRevertEmailChange";
import useRevokeRefreshTokens from "./useRevokeRefreshTokens";
import useStartTwoFactorSetup from "./useStartTwoFactorSetup";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateMe from "./useUpdateMe";
import useUpdateProfilePicture from "./useUpdateProfilePicture";
import useVerifyEmailChangeConfirm from "./useVerifyEmailChangeConfirm";
import useVerifyEmailChangeRevert from "./useVerifyEmailChangeRevert";
import useVerifyResetToken from "./useVerifyResetToken";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useVerifyEmailChangeConfirm,
	useVerifyEmailChangeRevert,
	useConfirmEmailChange,
	useRevertEmailChange,
	useCancelEmailChange,
	useGetAuthenticatedUser,
	useUpdateMe,
	useRevokeRefreshTokens,
	useUnlinkAuthProvider,
	useCreateProfilePictureUploadSession,
	useUpdateProfilePicture,
	useDeleteProfilePicture,
	useStartTwoFactorSetup,
	useConfirmTwoFactor,
	useRegenerateRecoveryCodes,
	useDisableTwoFactor,
	integrations,
};

export default exportObject;
