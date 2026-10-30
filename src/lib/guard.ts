import 'server-only'

/**
 * Protection against test data reaching the production database.
 *
 * In October 2026 the test suite was run against the live Neon
 * database. The clean-up did not take everything with it, and 95 test
 * accounts and 80 test classes were left behind — the demo would have
 * shown customers called "Kundin Nr140" and an instructor called
 * "Serien Nr169".
 *
 * `ALLOW_SEED` alone is not enough, because the local server can be
 * pointed at the production database at any time. So the test routes
 * that write data also check WHICH database they are talking to.
 */

/** Postgres means production. Locally the prototype uses an SQLite file. */
export const liveDatabase = (): boolean =>
  /^postgres(ql)?:\/\//.test(process.env.DATABASE_URI ?? '')

export type Block = { blocked: true; response: Response } | { blocked: false }

/**
 * For routes that write test data. Returns the ready-made rejection
 * response when they must not run.
 *
 * `FORCE_TEST_ON_PRODUCTION=true` is deliberately awkward: if someone
 * really does want to test against production, let them spell it out.
 */
export const testBlock = (): Block => {
  if (process.env.ALLOW_SEED !== 'true') {
    return {
      blocked: true,
      response: Response.json({ error: 'deaktiviert' }, { status: 403 }),
    }
  }
  if (liveDatabase() && process.env.FORCE_TEST_ON_PRODUCTION !== 'true') {
    return {
      blocked: true,
      response: Response.json(
        {
          error: 'Test run against the production database blocked.',
          note:
            'DATABASE_URI points at Postgres. The test run creates test customers and test classes; anything left behind would show up in the administration view. Use the local SQLite file for the test run.',
        },
        { status: 409 },
      ),
    }
  }
  return { blocked: false }
}
