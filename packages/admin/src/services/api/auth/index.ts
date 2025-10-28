import useLogin from "./useLogin";
import useCsrf from "./useCsrf";
import useLogout from "./useLogout";
import useSetupRequired from "./useSetupRequired";
import useSetup from "./useSetup";
import useValidateInvitation from "./useValidateInvitation";
import useGetProviders from "./useGetProviders";
import useInitiateProvider from "./useInitiateProvider";
import useAcceptInvitation from "./useAcceptInvitation";

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
