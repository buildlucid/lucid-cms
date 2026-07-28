import account from "./account";
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
import oauthConnections from "./oauth-connections";
import permissions from "./permissions";
import publishOperations from "./publish-operations";
import roles from "./roles";
import settings from "./settings";
import share from "./share";
import tenants from "./tenants";
import userLogins from "./user-logins";
import users from "./users";

const exportObject = {
	auth,
	account,
	ai,
	users,
	userLogins,
	roles,
	permissions,
	publishOperations,
	share,
	media,
	mediaFolders,
	mediaShareLinks,
	settings,
	email,
	jobs,
	locales,
	collections,
	documents,
	integrations,
	oauthConnections,
	connection,
	tenants,
};

export default exportObject;
