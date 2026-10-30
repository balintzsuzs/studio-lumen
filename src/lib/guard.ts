import 'server-only'

/**
 * Védelem a teszt-adat ellen az éles adatbázisban.
 *
 * 2026 októberében valaki lefuttatta a teszt-készletet az éles Neon
 * adatbázison. A takarítás nem vitte el maga után mindet, és 95 teszt-fiók
 * meg 80 teszt-óra maradt ott — a bemutatón „Kundin Nr140" nevű ügyfelek
 * és „Serien Nr169" nevű oktató látszott volna.
 *
 * Az `ALLOW_SEED` önmagában nem elég, mert a helyi szervert bármikor rá
 * lehet állítani az éles adatbázisra. Ezért az adatot író teszt-útvonalak
 * megnézik azt is, MILYEN adatbázishoz beszélnek.
 */

/** Postgres = éles. A prototípus helyben SQLite fájlt használ. */
export const elesAdatbazis = (): boolean =>
  /^postgres(ql)?:\/\//.test(process.env.DATABASE_URI ?? '')

export type Tiltas = { tiltva: true; valasz: Response } | { tiltva: false }

/**
 * Teszt-adatot író útvonalakra. Visszaadja a kész elutasító választ,
 * ha nem szabad futnia.
 *
 * A `FORCE_TEST_ON_PRODUCTION=true` szándékosan körülményes: ha valaki
 * tényleg az éles adatbázison akar tesztelni, azt írja is le magának.
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
