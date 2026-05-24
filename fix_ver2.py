with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace(
    "document.addEventListener('DOMContentLoaded', fillVersionBadges);",
    "// Run immediately since script loads after DOM\nfillVersionBadges();"
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed")
