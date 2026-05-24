import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = []
def script_replacer(match):
    # match.group(1) is the opening tag attributes
    # match.group(2) is the content
    tag_attrs = match.group(1)
    content = match.group(2)
    if 'src=' not in tag_attrs:
        scripts.append(content)
        return ''
    return match.group(0)

new_html = re.sub(r'<script([^>]*)>(.*?)</script>', script_replacer, html, flags=re.DOTALL)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(scripts))

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Extracted", len(scripts), "script blocks")
