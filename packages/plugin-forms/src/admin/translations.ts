import type { TranslationRegistry } from "@lucidcms/admin/types";
import type messages from "../../translations/en.admin.json";

type FormsTranslations = TranslationRegistry<typeof messages>;
declare global {
	namespace LucidCMS {
		interface TranslationKeys extends FormsTranslations {}
	}
}
