# @lucidcms/plugin-nodemailer

## v1.1.5

- Fixed repeated transporter readiness warnings by verifying once per runtime lifecycle and skipping checks for queue consumers and simulated email.
- Removed the redundant transporter verification before each email send.
- Bumped `@lucidcms/core` to `0.16.0-alpha.0`.

## v1.1.4

- Bumped `@lucidcms/core` to `0.15.0-alpha.0`.

## v1.1.3

- Bumped `@lucidcms/core` to `0.14.0-alpha.0`.

## v1.1.2

- Added new `simulate` config option so you can stop emails been sent out in a dev environment but have them still registered as a success.
- Bumped core peer dependency version to `0.13.0-alpha.0`.

## v1.1.1

- Bumped core peer dependency version to `0.12.0-alpha.1`.

## v1.1.0

- Update to the error messaging.
- Updated to set new identifier key and return the sendMail response.
- Updated to Nodemailer v7.
- Bumped core peer dependency version to `0.12.0-alpha.0`.

## v1.0.8

- Bumped core peer dependency version.

## v1.0.7

- Bumped core peer dependency version.

## v1.0.6

- Bumped core peer dependency version.

## v1.0.5

- Bumped core peer dependency version.

## v1.0.4

- Bumped core peer dependency version.

## v1.0.3

- Bumped core peer dependency version and updated logger import.

## v1.0.2

- Bumped core peer dependency version.

## v1.0.1

- Updated LUCID_VERSION constant to support any core version pre 1.0.0.

## v1.0.0

- Core first release.
- Updated dependencies.
- @lucidcms/core@0.1.0.

## v0.1.0

- Updated response type and added support for lucid version checking.
