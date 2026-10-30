"""Formats the /setup/demo-check response into a readable list.

Reads from standard input. It lives in its own file because the quoting
of Python embedded in bash is impossible to untangle, and an f-string
will not take a backslash either.
"""
import json
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    print("  Could not read the status.")
    sys.exit(1)

if "checks" not in data:
    print("  Unexpected response:", data)
    sys.exit(1)

for check in data["checks"]:
    mark = "OK  " if check["ok"] else "FAIL"
    print("  [" + mark + "] " + check["title"])
    print("         " + check["detail"])
    todo = check.get("todo")
    if todo:
        print("         -> " + todo)

print()
if data["presentable"]:
    print("  ALL IN ORDER - ready to show.")
else:
    print("  " + str(data["errors"]) + " item(s) not in order, see above.")
    sys.exit(2)
