"""A /setup/demo-check válaszát olvasható listává formázza.

A szabvány bemenetről olvas. Külön fájlban van, mert a bash-be ágyazott
Python idézőjelei kibogozhatatlanok, és az f-string sem tűri a
visszaperjelet.
"""
import json
import sys

try:
    adat = json.load(sys.stdin)
except Exception:
    print("  Nem sikerult lekerdezni az allapotot.")
    sys.exit(1)

if "pontok" not in adat:
    print("  Varatlan valasz:", adat)
    sys.exit(1)

for pont in adat["pontok"]:
    jel = "OK  " if pont["rendben"] else "HIBA"
    cim = pont["cim"]
    reszlet = pont["reszlet"]
    print("  [" + jel + "] " + cim)
    print("         " + reszlet)
    teendo = pont.get("teendo")
    if teendo:
        print("         -> " + teendo)

print()
if adat["bemutathato"]:
    print("  MINDEN RENDBEN - bemutathato.")
else:
    print("  " + str(adat["hibak"]) + " dolog nincs rendben, lasd fent.")
    sys.exit(2)
