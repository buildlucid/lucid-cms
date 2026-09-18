import type { TranslationRegistry } from "@lucidcms/admin/types";
import type messages from "../../translations/en.admin.json";

type SeoTranslations = TranslationRegistry<typeof messages>;
declare global {
	namespace LucidCMS {
		interface CopyTranslationKeys extends SeoTranslations {}
	}
}
