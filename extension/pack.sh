#!/bin/sh
# Prépare l'extension à installer sans la publier : vyra-extension.zip à la racine du dépôt
# (sans scenarios.html, README.md, tests ni ce script). Il suffit de Python 3.
# Installation : décompresser, puis chrome://extensions > mode développeur > Charger l'extension non empaquetée.
set -e
cd "$(dirname "$0")"
python3 - <<'PY'
import os, zipfile
skip = {"scenarios.html", "README.md", "pack.sh"}
skip_dirs = ("tests",)
out = os.path.abspath("../vyra-extension.zip")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk("."):
        for name in sorted(files):
            path = os.path.join(root, name)
            rel = os.path.relpath(path, ".")
            if rel not in skip and not rel.startswith(skip_dirs):
                z.write(path, os.path.relpath(path, "."))
print("Prêt :", out)
PY
