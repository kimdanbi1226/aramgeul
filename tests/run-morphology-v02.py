import json
import subprocess
from pathlib import Path

SUITE = json.loads(Path("tests/golden/morphology.v0.2.json").read_text())["cases"]


def map_tag(tag, surface):
    base = tag.split("-")[0]
    if base == "JX":
        return {"JOSA"}
    if base == "NNB":
        return {"DEPENDENT_NOUN"}
    if base == "VX":
        return {"AUXILIARY_VERB"}
    if base in {"VV", "VA", "VCP", "VCN"}:
        return {"LEXICAL_VERB"}
    if base in {"EF", "EC", "EP"}:
        return {"ENDING"}
    if base in {"ETM", "ETN"}:
        return {"MODIFIER"}
    if base == "MAG" and surface in {"안", "못"}:
        return {"NEGATIVE_ADVERB"}
    if "+" in tag:
        out = set()
        for part in tag.split("+"):
            out |= map_tag(part, surface)
        return out
    return set()


def matches(tokens, target):
    required = set(target.get("required_functions", []))
    surfaces = target.get("surface_options")
    if surfaces is None:
        surfaces = [target["surface"]]
    for surface, tag in tokens:
        if surface in surfaces and required.intersection(map_tag(tag, surface)):
            return True
    return False


def case_matches(tokens, case):
    for target_set in case["acceptable_target_sets"]:
        if all(matches(tokens, target) for target in target_set):
            return True
    return False


def run_candidate(name, analyzed_cases):
    passed = 0
    print(f"\\n===== {name} =====")
    for case, tokens in zip(SUITE, analyzed_cases):
        ok = case_matches(tokens, case)
        if ok:
            passed += 1
        status = "MATCH" if ok else "MISMATCH"
        print(f"{status} {case['id']} {case['input']}")
        print("  " + " ".join(f"{surface}/{tag}" for surface, tag in tokens))
    print(f"{name}: {passed} MATCH / {len(SUITE)-passed} MISMATCH / {len(SUITE)} total")
    return passed


# Kiwi
from kiwipiepy import Kiwi
kiwi = Kiwi()
kiwi_cases = [
    [(str(t.form), str(t.tag)) for t in kiwi.tokenize(case["input"])]
    for case in SUITE
]
kiwi_score = run_candidate("Kiwi", kiwi_cases)


# KOMORAN
from PyKomoran import Komoran
komoran = Komoran("STABLE")
komoran_cases = []
for case in SUITE:
    tokens = []
    for item in komoran.get_plain_text(case["input"]).split():
        surface, tag = item.rsplit("/", 1)
        tokens.append((surface, tag))
    komoran_cases.append(tokens)
komoran_score = run_candidate("KOMORAN", komoran_cases)


# MeCab-Ko Docker
text = "\\n".join(case["input"] for case in SUITE) + "\\n"
result = subprocess.run(
    ["docker", "run", "--rm", "-i", "ghcr.io/hephaex/mecab-ko:latest", "parse"],
    input=text,
    text=True,
    capture_output=True,
    check=True,
)
blocks = result.stdout.split("EOS")
mecab_cases = []
for block in blocks[:len(SUITE)]:
    tokens = []
    for line in block.splitlines():
        line = line.strip()
        if not line or "\\t" not in line:
            continue
        surface, feature = line.split("\\t", 1)
        pos = feature.split(",", 1)[0]
        tokens.append((surface, pos))
    mecab_cases.append(tokens)
mecab_score = run_candidate("MeCab-Ko", mecab_cases)


print("\\n===== SUMMARY =====")
print(f"Kiwi: {kiwi_score}/{len(SUITE)}")
print(f"KOMORAN: {komoran_score}/{len(SUITE)}")
print(f"MeCab-Ko: {mecab_score}/{len(SUITE)}")
