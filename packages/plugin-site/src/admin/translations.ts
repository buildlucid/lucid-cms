import type { TranslationRegistry } from "@lucidcms/admin/types";
import type messages from "../../translations/en.admin.json";

type SiteTranslations = TranslationRegistry<typeof messages>;
declare global {
	namespace LucidCMS {
		interface TranslationKeys extends SiteTranslations {}
	}
}
