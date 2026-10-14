/**
 * @fileoverview UserModel — typed shape for test user credentials.
 * Actual values live in data/users.ts; this file defines the contract.
 */

export interface User {
  /** Login username */
  username: string;
  /** Login password (dummy test accounts only) */
  password: string;
  /** Name the Home header greets the user with ("Hi, <displayName>"); unknown until captured */
  displayName?: string;
}
