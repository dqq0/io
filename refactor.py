import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract styles
style_pattern = re.compile(r'<style>(.*?)</style>', re.DOTALL)
style_match = style_pattern.search(content)
if style_match:
    with open('styles.css', 'w', encoding='utf-8') as f:
        f.write(style_match.group(1).strip())
    content = content[:style_match.start()] + '<link rel="stylesheet" href="styles.css">' + content[style_match.end():]

# Extract script (excluding the vis-network one)
script_pattern = re.compile(r'<script>(.*?)</script>', re.DOTALL)
script_match = script_pattern.search(content)
if script_match:
    with open('main.js', 'w', encoding='utf-8') as f:
        f.write(script_match.group(1).strip())
    content = content[:script_match.start()] + '<script src="main.js"></script>' + content[script_match.end():]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete.")
