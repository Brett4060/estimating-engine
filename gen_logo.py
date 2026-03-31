import base64, io
from PIL import Image

with open(r'C:\GST\GSTAddin\GSTAddin\GST_ONLY_Logo.png', 'rb') as f:
    data = f.read()
b64 = base64.b64encode(data).decode()

img = Image.open(r'C:\GST\GSTAddin\GSTAddin\GST_ONLY_Logo.png')
img_fav = img.resize((32, 32), Image.Resampling.LANCZOS)
buf = io.BytesIO()
img_fav.save(buf, format='PNG')
b64_fav = base64.b64encode(buf.getvalue()).decode()

lines = [
    '// GST logo embedded as base64',
    'export const GST_LOGO = "data:image/png;base64,' + b64 + '";',
    'export const GST_FAVICON = "data:image/png;base64,' + b64_fav + '";',
]

with open(r'C:\GST\estimating-engine\app\src\logoData.js', 'w') as f:
    f.write('\n'.join(lines) + '\n')

print('logoData.js written OK')
