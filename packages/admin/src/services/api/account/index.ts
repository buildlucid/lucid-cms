import useForgotPassword from "./useForgotPassword";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useResetPassword from "./useResetPassword";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";
import useUpdateMe from "./useUpdateMe";
import useVerifyResetToken from "./useVerifyResetToken";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useGetAuthenticatedUser,
	useUpdateMe,
	useUnlinkAuthProvider,
};

export default exportObject;
