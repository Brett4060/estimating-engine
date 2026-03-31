from PIL import Image
import os

img = Image.open(r'C:\GST\GSTAddin\GSTAddin\GST_ONLY_Logo.png')

# Create .ico with multiple sizes
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
icons = []
for s in sizes:
    resized = img.resize(s, Image.Resampling.LANCZOS)
    icons.append(resized)

ico_path = r'C:\Users\Brett\Desktop\GST_Estimating.ico'
icons[0].save(ico_path, format='ICO', sizes=[(s.width, s.height) for s in icons], append_images=icons[1:])
print(f'Created {ico_path}')

# Create a Windows shortcut (.url file that opens the HTML)
html_path = r'C:\Users\Brett\Desktop\GST_Estimating_Tool.html'
shortcut_path = r'C:\Users\Brett\Desktop\GST Estimating Tool.url'
with open(shortcut_path, 'w') as f:
    f.write('[InternetShortcut]\n')
    f.write(f'URL=file:///{html_path.replace(os.sep, "/")}\n')
    f.write(f'IconFile={ico_path}\n')
    f.write('IconIndex=0\n')
print(f'Created shortcut: {shortcut_path}')
