import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# find FIREBASE_CONFIG
match = re.search(r'(const FIREBASE_CONFIG = \{.*?\};)', js, re.DOTALL)
if match:
    config_code = match.group(1)
    with open('js/config.js', 'w', encoding='utf-8') as f:
        f.write(config_code)
    
    # remove from app.js
    new_js = js.replace(config_code, '')
    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(new_js)
    print("Config extracted")
else:
    print("Config not found")

# update HTML
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

if '<script src="js/config.js"></script>' not in html:
    html = html.replace('<script src="js/app.js"></script>', '<script src="js/config.js"></script>\n<script src="js/app.js"></script>')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
