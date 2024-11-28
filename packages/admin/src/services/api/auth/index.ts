import useLogin from "./useLogin";
import useCsrf from "./useCsrf";
import useLogout from "./useLogout";

const exportObject: {
	useLogin: typeof useLogin;
	useCsrf: typeof useCsrf;
	useLogout: typeof useLogout;
} = {
	useLogin,
	useCsrf,
	useLogout,
};
export default exportObject;
