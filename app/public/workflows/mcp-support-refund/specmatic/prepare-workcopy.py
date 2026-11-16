#!/usr/bin/env python3
"""Prépare une copie de travail de l'exemple pour Specmatic Arazzo (specmatic/enterprise:1.29.2).

Les fichiers publiés restent conformes à Arazzo 1.1 ; cette copie applique les six
adaptations mesurées le 16/11/2026 (voir README, section « Specmatic ») :

1. retrait de `$self` (sinon les `url` relatives seraient résolues contre l'URL publique) ;
2. `channelPath` → `operationId` (Specmatic 1.29.2 ne retrouve pas l'opération par channelPath) ;
3. AsyncAPI inversée : Specmatic attend l'AsyncAPI du système testé (send ↔ receive) ;
4. retrait de l'alternative `security: [..., {}]` de l'OpenAPI (NoSecurityScheme non supporté) ;
5. retrait des critères qui comparent une entrée à la réponse (`$inputs.amount <= …`),
   non évaluables par la validation statique « closed-loop » ;
6. retrait des actions `onFailure: end` sans `criteria` (refusées par la validation statique).

Usage : python3 prepare-workcopy.py <dossier-cible>   (nécessite PyYAML)
"""
import pathlib
import shutil
import sys

import yaml

src = pathlib.Path(__file__).resolve().parent.parent
dst = pathlib.Path(sys.argv[1]).resolve()
dst.mkdir(parents=True, exist_ok=True)

arazzo = yaml.safe_load((src / "mcp-support-refund.arazzo.yaml").read_text())
arazzo.pop("$self", None)                                                    # 1
for wf in arazzo["workflows"]:
    for step in wf["steps"]:
        if "channelPath" in step:                                            # 2
            step.pop("channelPath")
            step["operationId"] = "$sourceDescriptions.refundEvents.sendRefundIssued"
        if "successCriteria" in step:                                        # 5
            step["successCriteria"] = [c for c in step["successCriteria"]
                                       if not c["condition"].startswith("$inputs.")]
        if "onFailure" in step:                                              # 6
            step["onFailure"] = [a for a in step["onFailure"]
                                 if not (a.get("type") == "end" and "criteria" not in a)]
            if not step["onFailure"]:
                del step["onFailure"]
(dst / "mcp-support-refund.arazzo.yaml").write_text(
    yaml.safe_dump(arazzo, sort_keys=False, allow_unicode=True))

asyncapi = yaml.safe_load((src / "asyncapi.yaml").read_text())
for op in asyncapi["operations"].values():                                   # 3
    op["action"] = {"send": "receive", "receive": "send"}[op["action"]]
(dst / "asyncapi.yaml").write_text(yaml.safe_dump(asyncapi, sort_keys=False, allow_unicode=True))

openapi = yaml.safe_load((src / "openapi.yaml").read_text())
openapi.pop("security", None)                                                # 4
openapi["components"].pop("securitySchemes", None)
(dst / "openapi.yaml").write_text(yaml.safe_dump(openapi, sort_keys=False, allow_unicode=True))

shutil.copy(src / "specmatic" / "mcp-support-refund.arazzo_input.json", dst)
print(f"Copie de travail Specmatic prête dans {dst}")
