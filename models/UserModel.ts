/**
 * @fileoverview UserModel — typed shape for test user credentials.
 * Actual values live in data/users.ts; this file defines the contract.
 */

export interface User {
  /** Login username */
  username: string;
  /** Login password */
  password: string;
}
