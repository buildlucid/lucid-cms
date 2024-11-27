import useForgotPassword from "./useForgotPassword";
import useResetPassword from "./useResetPassword";
import useVerifyResetToken from "./useVerifyResetToken";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser";
import useUpdateMe from "./useUpdateMe";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useGetAuthenticatedUser,
	useUpdateMe,
};

export default exportObject;
