import useForgotPassword from "./useForgotPassword";
import useResetPassword from "./useResetPassword";
import useVerifyResetToken from "./useVerifyResetToken";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useUpdateMe from "./useUpdateMe";
import useUnlinkAuthProvider from "./useUnlinkAuthProvider";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useGetAuthenticatedUser,
	useUpdateMe,
	useUnlinkAuthProvider,
};

export default exportObject;
