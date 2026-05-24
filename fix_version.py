import re

# 1. Fix index.html - replace hardcoded versions with dynamic placeholders
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace version badge content
html = html.replace('>Beta 1.0.1</div>', ' class="version-auto"></div>', 1)
# Fix the double class issue on versionBadge
html = html.replace('id="versionBadge" class="version-auto"', 'id="versionBadge"')

# Replace login footer
html = html.replace(
    'Beta 1.0.1 · © 2025 SYD Constructores · Todos los derechos reservados',
    '<span class="version-auto"></span> · © 2025 SYD Constructores · Todos los derechos reservados'
)

# Replace selector subtitle
html = html.replace(
    'Selecciona una obra · Beta 1.0.1',
    'Selecciona una obra · <span class="version-auto"></span>'
)

# Replace app subtitle
html = html.replace(
    'Sistema de Gestión de Obras Beta 1.0.1',
    'Sistema de Gestión de Obras <span class="version-auto"></span>'
)

# Replace the debug version text
html = html.replace(
    'SYD Beta 1.0.1 (FIX-LOGIN-SCROLL)',
    'SYD <span class="version-auto"></span>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Fix app.js - use APP_VERSION everywhere and add auto-fill function
with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove duplicate version variable
js = js.replace("    const version = 'Beta 1.0.1';", '    const version = APP_VERSION;')

# Add version auto-fill function right after APP_VERSION declaration
version_filler = """

// Auto-fill all version placeholders
function fillVersionBadges() {
    document.getElementById('versionBadge').textContent = APP_VERSION;
    document.querySelectorAll('.version-auto').forEach(el => {
        el.textContent = APP_VERSION;
    });
}
document.addEventListener('DOMContentLoaded', fillVersionBadges);
"""

js = js.replace(
    "const APP_VERSION = 'Beta 1.0.1';",
    "const APP_VERSION = 'Beta 1.0.1';" + version_filler
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

# 3. Fix sw.js
with open('sw.js', 'r', encoding='utf-8') as f:
    sw = f.read()

sw = sw.replace('v2.4.3', 'Beta-1.0.1')

with open('sw.js', 'w', encoding='utf-8') as f:
    f.write(sw)

print("Done! All versions now controlled by APP_VERSION in js/app.js")
