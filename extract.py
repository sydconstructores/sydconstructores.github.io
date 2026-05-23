import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract styles
styles = []
def style_replacer(match):
    styles.append(match.group(1))
    return ''

new_html = re.sub(r'<style>(.*?)</style>', style_replacer, html, flags=re.DOTALL)
with open('css/app.css', 'w', encoding='utf-8') as f:
    f.write('\n'.join(styles))

# Insert CSS link before </head>
new_html = new_html.replace('</head>', '<link rel="stylesheet" href="css/app.css">\n</head>')

# Extract scripts (ignore scripts with src attribute)
scripts = []
def script_replacer(match):
    # match.group(0) is the full tag, match.group(1) is the content
    content = match.group(1)
    if 'src=' not in match.group(0):
        scripts.append(content)
        return ''
    return match.group(0)

new_html_2 = re.sub(r'<script\b[^>]*>(.*?)</script>', script_replacer, new_html, flags=re.DOTALL)
with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(scripts))

# Insert JS link before </body>
new_html_2 = new_html_2.replace('</body>', '<script src="js/app.js"></script>\n</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html_2)

print("Extracted", len(styles), "style blocks and", len(scripts), "script blocks")
