import account from "./account";
import agent from "./agent";
import ai from "./ai";
import auth from "./auth";
import collections from "./collections";
import connection from "./connection";
import documents from "./documents";
import email from "./email";
import integrations from "./integrations";
import jobs from "./jobs";
import locales from "./locales";
import media from "./media";
import mediaFolders from "./media-folders";
import mediaShareLinks from "./media-share-links";
import notifications from "./notifications";
import oauthClients from "./oauth-clients";
import oauthConnections from "./oauth-connections";
import permissions from "./permissions";
import requests from "./requests";
import review from "./review";
import roles from "./roles";
import settings from "./settings";
import share from "./share";
import userLogins from "./user-logins";
import users from "./users";

const exportObject = {
	auth,
	account,
	agent,
	ai,
	users,
	userLogins,
	roles,
	permissions,
	requests,
	review,
	share,
	media,
	mediaFolders,
	mediaShareLinks,
	notifications,
	settings,
	email,
	jobs,
	locales,
	collections,
	documents,
	integrations,
	oauthConnections,
	oauthClients,
	connection,
};

export default exportObject;
