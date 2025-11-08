# Lucid CMS Monorepo Licensing

This repository is a monorepo that contains multiple packages, each potentially governed by its own software license. Below is a summary of the licensing model applied across the repository.

---

## 📦 Core Packages (BSL 1.1)

The following packages are licensed under the **Business Source License 1.1 (BSL 1.1)**:

- [`@lucidcms/core`](packages/core)
- [`@lucidcms/admin`](packages/admin)

Each of these packages includes its own `LICENSE` file with the full BSL 1.1 license text and relevant Change Dates.

**Usage Note:**
BSL 1.1 allows non-production and limited use under specific conditions. After a fixed time period (4 years), the license transitions to the [MIT License](https://opensource.org/licenses/MIT).

---

## 🔌 Plugin Packages (MIT)

The following packages are licensed under the **MIT License**, a permissive open source license:

- `@lucidcms/plugin-s3`
- `@lucidcms/plugin-nodemailer`
- `@lucidcms/plugin-pages`
- `@lucidcms/auth-github`
- `@lucidcms/auth-google`
- `@lucidcms/auth-microsoft`
- All other packages in `packages/` that are prefixed with `plugin-`

Each MIT-licensed package includes its own `LICENSE` file.

---

## 🗄 Adapters (MIT)

Also MIT-licensed:

- `@lucidcms/sqlite-adapter`
- `@lucidcms/postgres-adapter`
- `@lucidcms/libsql-adapter`
- `@lucidcms/node-adapter`
- `@lucidcms/cloudflare-adapter`

---

## 📝 License Summary

| Package Group       | License    | Location          |
|---------------------|------------|-------------------|
| Core (`core`, `admin`) | BSL 1.1    | In each package    |
| Plugins              | MIT        | In each package    |
| Adapters/Utils       | MIT        | In each package    |

---

## 📘 Why this model?

This licensing structure is designed to:

- Encourage open plugin and adapter development.
- Protect the long-term sustainability of Lucid CMS core development.
- Allow businesses to adopt the system with a clear path to compliance and openness over time.

For more information or to discuss commercial licensing options for BSL packages, please see the [Lucid CMS GitHub page](https://github.com/buildlucid/lucid-cms).
