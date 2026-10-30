"""Formats the /setup/demo-check response into a readable list.

Reads from standard input. It lives in its own file because the quoting
of Python embedded in bash is impossible to untangle, and an f-string
will not take a backslash either.
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
    print("  " + str(adat["hibak"]) + " item(s) not in order, see above.")
    sys.exit(2)
