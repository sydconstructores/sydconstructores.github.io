with open('gantt_mobile.html', encoding='utf-8') as f:
    h = f.read()

lines = h.split('\n')
# Show all JS lines with number 16 that are in script section
in_script = False
for i, line in enumerate(lines, 1):
    if '<script>' in line:
        in_script = True
    if '</script>' in line:
        in_script = False
    if in_script and '16' in line and any(k in line for k in ['max', 'week', 'Week', 'i<=', 'w<=', '/16', '/15', 'repeat', 'ms', 'sem', 'Sem']):
        print(f"L{i}: {line.strip()[:130]}")
