import useAcceptInvitation from "./useAcceptInvitation";
import useCsrf from "./useCsrf";
import useGetProviders from "./useGetProviders";
import useInitiateProvider from "./useInitiateProvider";
import useLogin from "./useLogin";
import useLogout from "./useLogout";
import useSetup from "./useSetup";
import useSetupRequired from "./useSetupRequired";
import useValidateInvitation from "./useValidateInvitation";

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
};
export default exportObject;
