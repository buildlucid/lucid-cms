import T from "../../translations/index.js";
import { LucidError } from "../../utils/errors/index.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import ClientIntegrationsRepository from "./client-integrations.js";
import CollectionMigrationsRepository from "./collection-migrations.js";
import CollectionsRepository from "./collections.js";
import DocumentBricksRepository from "./document-bricks.js";
import DocumentVersionsRepository from "./document-versions.js";
import DocumentsRepository from "./documents.js";
import EmailTransactionsRepository from "./email-transactions.js";
import EmailsRepository from "./emails.js";
import LocalesRepository from "./locales.js";
import MediaRepository from "./media.js";
import MediaAwaitingSyncRepository from "./media-awaiting-sync.js";
import MediaFoldersRepository from "./media-folders.js";
import MediaShareLinksRepository from "./media-share-links.js";
import MediaTranslationsRepository from "./media-translations.js";
import OptionsRepository from "./options.js";
import ProcessedImagesRepository from "./processed-images.js";
import QueueJobsRepository from "./queue-jobs.js";
import RolePermissionsRepository from "./role-permissions.js";
import RolesRepository from "./roles.js";
import UserLoginsRepository from "./user-logins.js";
import UserRolesRepository from "./user-roles.js";
// Repositories
import UserTokensRepository from "./user-tokens.js";
import UsersRepository from "./users.js";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
class Repository {
	static get<T extends keyof RepositoryClassMap>(
		repository: T,
		db: KyselyDB,
		dbAdapter: DatabaseAdapter,
	): RepositoryReturnType<T> {
		switch (repository) {
			case "user-tokens":
				return new UserTokensRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "user-logins":
				return new UserLoginsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "collections":
				return new CollectionsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "collection-migrations":
				return new CollectionMigrationsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "documents":
				return new DocumentsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "document-versions":
				return new DocumentVersionsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "document-bricks":
				return new DocumentBricksRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "emails":
				return new EmailsRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "email-transactions":
				return new EmailTransactionsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "locales":
				return new LocalesRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "media":
				return new MediaRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "media-translations":
				return new MediaTranslationsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "media-awaiting-sync":
				return new MediaAwaitingSyncRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "media-folders":
				return new MediaFoldersRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "media-share-links":
				return new MediaShareLinksRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "options":
				return new OptionsRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "processed-images":
				return new ProcessedImagesRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "role-permissions":
				return new RolePermissionsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "roles":
				return new RolesRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "user-roles":
				return new UserRolesRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "users":
				return new UsersRepository(db, dbAdapter) as RepositoryReturnType<T>;
			case "client-integrations":
				return new ClientIntegrationsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			case "queue-jobs":
				return new QueueJobsRepository(
					db,
					dbAdapter,
				) as RepositoryReturnType<T>;
			default:
				throw new LucidError({
					message: T("cannot_find_repository", {
						name: repository,
					}),
				});
		}
	}
}

type RepositoryClassMap = {
	"user-tokens": UserTokensRepository;
	"user-logins": UserLoginsRepository;
	collections: CollectionsRepository;
	"collection-migrations": CollectionMigrationsRepository;
	emails: EmailsRepository;
	"email-transactions": EmailTransactionsRepository;
	locales: LocalesRepository;
	media: MediaRepository;
	"media-translations": MediaTranslationsRepository;
	"media-awaiting-sync": MediaAwaitingSyncRepository;
	"media-folders": MediaFoldersRepository;
	"media-share-links": MediaShareLinksRepository;
	options: OptionsRepository;
	"processed-images": ProcessedImagesRepository;
	"role-permissions": RolePermissionsRepository;
	roles: RolesRepository;
	"user-roles": UserRolesRepository;
	users: UsersRepository;
	"client-integrations": ClientIntegrationsRepository;
	documents: DocumentsRepository;
	"document-versions": DocumentVersionsRepository;
	"document-bricks": DocumentBricksRepository;
	"queue-jobs": QueueJobsRepository;
};

type RepositoryReturnType<T extends keyof RepositoryClassMap> =
	RepositoryClassMap[T];

export default Repository;
