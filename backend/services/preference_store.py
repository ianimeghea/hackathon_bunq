import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
PREFS_FILE = DATA_DIR / "preferences.json"


class PreferenceStore:
    def __init__(self):
        DATA_DIR.mkdir(exist_ok=True)
        self._prefs = self._load()

    def _load(self) -> dict:
        if PREFS_FILE.exists():
            return json.loads(PREFS_FILE.read_text())
        return {"item_rules": {}}

    def _save(self):
        PREFS_FILE.write_text(json.dumps(self._prefs, indent=2))

    def get_all(self) -> dict:
        return self._prefs

    def get_rules_prompt(self) -> str:
        rules = self._prefs.get("item_rules", {})
        if not rules:
            return ""
        lines = []
        for item_key, category in rules.items():
            lines.append(f'- "{item_key}" should be categorized as "{category}"')
        return (
            "The user has provided the following preferences from past corrections. "
            "You MUST respect these when categorizing items:\n"
            + "\n".join(lines)
        )

    def learn_from_corrections(self, original_items: list, corrected_items: list):
        rules = self._prefs.setdefault("item_rules", {})
        orig_map = {i["name"]: i["category"] for i in original_items}
        for corrected in corrected_items:
            name = corrected["name"]
            orig_cat = orig_map.get(name)
            if orig_cat and orig_cat != corrected["category"]:
                key = name.strip().lower()
                rules[key] = corrected["category"]
        self._save()


preference_store = PreferenceStore()
