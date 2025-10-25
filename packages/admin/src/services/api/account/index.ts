import useForgotPassword from "./useForgotPassword.jsx";
import useResetPassword from "./useResetPassword.jsx";
import useVerifyResetToken from "./useVerifyResetToken.jsx";
import useGetAuthenticatedUser from "./useGetAuthenticatedUser.jsx";
import useUpdateMe from "./useUpdateMe.jsx";

const exportObject = {
	useForgotPassword,
	useResetPassword,
	useVerifyResetToken,
	useGetAuthenticatedUser,
	useUpdateMe,
};

export default exportObject;
