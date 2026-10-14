import type { User } from '@models/UserModel';

/** Shared password of all retail-staging test accounts (dummy, staging only). */
const STAGING_PASSWORD = 'Kony@1234';

/**
 * Retail-staging accounts able to log in. The first row is the default account
 * (`StandardUser`): reordering the list changes who every test logs in as.
 * displayName is filled in once captured from the Home greeting.
 */
export const StagingUsers = [
  { username: '8820742198', password: STAGING_PASSWORD, displayName: 'MOURAD' },
  { username: '0680632358', password: STAGING_PASSWORD, displayName: 'AMIRA' },
  { username: 'User_1210676', password: STAGING_PASSWORD, displayName: 'MOUSTAFA' },
  { username: 'vbujjam123', password: STAGING_PASSWORD, displayName: 'MOHAMED' },
  { username: 'User_1100700', password: STAGING_PASSWORD, displayName: 'INAS' },
  { username: 'superwomen', password: STAGING_PASSWORD },
  { username: '6353457664', password: STAGING_PASSWORD,  },
  { username: '4231945428', password: STAGING_PASSWORD },
  { username: 'User_13101646', password: STAGING_PASSWORD },
  { username: 'loans2026', password: STAGING_PASSWORD },
] as const satisfies readonly User[];

/** Default account for the auto-login fixture and login.spec.ts. */
export const StandardUser = StagingUsers[1];

/** A login attempt the app must reject; `desc` names the case in test titles. */
type InvalidCredentials = User & { desc: string };

/**
 * Credentials the app must reject (negative login tests).
 * wrongPassword uses a non-default account on purpose: repeated failed logins
 * can lock an account, and a locked StandardUser breaks every test's auto-login.
 */
export const InvalidUserData = {
  wrongPassword: {
    desc: 'a valid username and a wrong password',
    username: StagingUsers[9].username,
    password: 'Wrong@1234',
  },
  nonExistingUsername: {
    desc: 'a non-existing username',
    username: 'nonexistent_user_000',
    password: STAGING_PASSWORD,
  },
} as const satisfies Record<string, InvalidCredentials>;
