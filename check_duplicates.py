import re

with open('src/data/localBank.ts', 'r', encoding='utf-8') as f:
    content = f.read()

ids = re.findall(r"id:\s*'([^']+)'", content)
seen = {}
duplicates = []
for i, id_val in enumerate(ids):
    if id_val in seen:
        duplicates.append(id_val)
    seen[id_val] = i

print("Duplicate IDs:", duplicates)
