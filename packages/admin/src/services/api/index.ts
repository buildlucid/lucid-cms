import auth from "./auth";
import account from "./account";
import users from "./users";
import roles from "./roles";
import permissions from "./permissions";
import media from "./media";
import mediaFolders from "./media-folders";
import settings from "./settings";
import email from "./email";
import jobs from "./jobs";
import locales from "./locales";
import collections from "./collections";
import documents from "./documents";
import clientIntegrations from "./client-integrations";
import license from "./license";

const exportObject: {
	auth: typeof auth;
	account: typeof account;
	users: typeof users;
	roles: typeof roles;
	permissions: typeof permissions;
	media: typeof media;
	mediaFolders: typeof mediaFolders;
	settings: typeof settings;
	email: typeof email;
	jobs: typeof jobs;
	locales: typeof locales;
	collections: typeof collections;
	documents: typeof documents;
	clientIntegrations: typeof clientIntegrations;
	license: typeof license;
} = {
	auth,
	account,
	users,
	roles,
	permissions,
	media,
	mediaFolders,
	settings,
	email,
	jobs,
	locales,
	collections,
	documents,
	clientIntegrations,
	license,
};

export default exportObject;
