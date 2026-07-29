# Lucid OAuth Playground

A small browser-based public client for manually testing Lucid integration
authentication.

It supports:

- OAuth Authorization Code with S256 PKCE
- client metadata documents or a pre-registered public client ID
- Authorization Server and Protected Resource discovery
- access-token refresh and refresh-token revocation
- user and system grants selected in the Lucid consent screen
- authenticated external API requests using OAuth or an integration key

Copy `.env.example` to `.env`. By default, the playground publishes and uses
its own Client ID Metadata Document. To test a registered public application,
set `VITE_OAUTH_CLIENT_ID` to the Client ID shown by Lucid and register
`http://localhost:5173/callback` as a redirect URL.
