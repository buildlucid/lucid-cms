import useLogin from "./useLogin";
import useCsrf from "./useCsrf";
import useLogout from "./useLogout";
import useSetupRequired from "./useSetupRequired";
import useSetup from "./useSetup";

const exportObject: {
	useLogin: typeof useLogin;
	useCsrf: typeof useCsrf;
	useLogout: typeof useLogout;
	useSetupRequired: typeof useSetupRequired;
	useSetup: typeof useSetup;
} = {
	useLogin,
	useCsrf,
	useLogout,
	useSetupRequired,
	useSetup,
};
export default exportObject;
