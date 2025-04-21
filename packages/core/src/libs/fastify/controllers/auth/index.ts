import getCSRF from "./get-csrf.js";
import login from "./login.js";
import token from "./token.js";
import logout from "./logout.js";

interface AuthRouteControllers {
	getCSRF: typeof getCSRF;
	login: typeof login;
	token: typeof token;
	logout: typeof logout;
}

const controllers: AuthRouteControllers = {
	getCSRF,
	login,
	token,
	logout,
};

export default controllers;
