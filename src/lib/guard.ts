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
export const elesAdatbazis = (): boolean =>
  /^postgres(ql)?:\/\//.test(process.env.DATABASE_URI ?? '')

export type Tiltas = { tiltva: true; valasz: Response } | { tiltva: false }

/**
 * For routes that write test data. Returns the ready-made rejection
 * response when they must not run.
 *
 * `FORCE_TEST_ON_PRODUCTION=true` is deliberately awkward: if someone
 * really does want to test against production, let them spell it out.
 */
export const tesztTiltas = (): Tiltas => {
  if (process.env.ALLOW_SEED !== 'true') {
    return {
      tiltva: true,
      valasz: Response.json({ error: 'deaktiviert' }, { status: 403 }),
    }
  }
  if (elesAdatbazis() && process.env.FORCE_TEST_ON_PRODUCTION !== 'true') {
    return {
      tiltva: true,
      valasz: Response.json(
        {
          error: 'Testlauf gegen die Produktionsdatenbank blockiert.',
          hinweis:
            'DATABASE_URI zeigt auf Postgres. Der Testlauf legt Testkundinnen und Testlektionen an; bleiben Reste zurück, sind sie in der Verwaltung sichtbar. Für den Testlauf die lokale SQLite-Datei verwenden.',
        },
        { status: 409 },
      ),
    }
  }
  return { tiltva: false }
}
