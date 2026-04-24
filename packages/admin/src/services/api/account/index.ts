import useDeleteProfilePicture from "./useDeleteProfilePicture";
import useForgotPassword from "./useForgotPassword";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useGetProfilePicturePresignedUrl from "./useGetProfilePicturePresignedUrl";
import useResetPassword from "./useResetPassword";
import useRevokeRefreshTokens from "./useRevokeRefreshTokens";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateMe from "./useUpdateMe";
import useUpdateProfilePicture from "./useUpdateProfilePicture";
import useVerifyResetToken from "./useVerifyResetToken";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useGetAuthenticatedUser,
	useUpdateMe,
	useRevokeRefreshTokens,
	useUnlinkAuthProvider,
	useGetProfilePicturePresignedUrl,
	useUpdateProfilePicture,
	useDeleteProfilePicture,
};

export default exportObject;
