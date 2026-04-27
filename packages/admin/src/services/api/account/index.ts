import useCancelEmailChange from "./useCancelEmailChange";
import useConfirmEmailChange from "./useConfirmEmailChange";
import useCreateProfilePictureUploadSession from "./useCreateProfilePictureUploadSession";
import useDeleteProfilePicture from "./useDeleteProfilePicture";
import useForgotPassword from "./useForgotPassword";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useResetPassword from "./useResetPassword";
import useRevertEmailChange from "./useRevertEmailChange";
import useRevokeRefreshTokens from "./useRevokeRefreshTokens";
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
};

export default exportObject;
