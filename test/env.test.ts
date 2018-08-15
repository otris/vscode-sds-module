/**
 * @file These file contains configuration properties for running the tests against a live system or the
 *       mocked JANUS system. It's recommended to setup the livesystem as described here to ensure that no
 *       tests will fail. If tests fail please check if it's not caused by your live system before making changes.
 */

/** Default server to connect with */
export const HOST = "localhost";

/** Port the server is listening on */
export const PORT = 11001;

/** An existing principal */
export const TEST_PRINCIPAL = "test";

/** A user which can be used to login with */
export const TEST_USER = "admin";

/** The passwort of the TEST_USER */
export const TEST_USER_PASS = "test123";

/**
 * Return true if you run the test against a live system
 */
export function isLiveMode(): boolean {
	// @ts-ignore
	return HOST !== "localhost" && PORT !== 11001;
}