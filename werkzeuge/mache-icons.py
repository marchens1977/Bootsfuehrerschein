# Erzeugt die App-Symbole icons/icon-192.png und icons/icon-512.png
# Aufruf: python3 werkzeuge/mache-icons.py   (braucht das Paket Pillow)
from PIL import Image, ImageDraw

def icon(groesse):
    s = groesse / 512
    img = Image.new("RGB", (groesse, groesse), "#002d72")
    d = ImageDraw.Draw(img)
    # Kopfhörer-Bügel
    d.arc([110*s, 90*s, 402*s, 382*s], 180, 360, fill="#ff5910", width=int(34*s))
    # Ohrmuscheln
    d.rounded_rectangle([96*s, 230*s, 176*s, 360*s], radius=int(26*s), fill="#ff5910")
    d.rounded_rectangle([336*s, 230*s, 416*s, 360*s], radius=int(26*s), fill="#ff5910")
    # Welle
    for i, y in enumerate([400, 440]):
        pts = []
        for x in range(120, 393, 4):
            import math
            pts.append((x*s, (y + 12*math.sin((x-120)/272*4*math.pi))*s))
        d.line(pts, fill="#ffffff" if i == 0 else "#ff5910", width=int(14*s))
    return img

for g in (192, 512):
    icon(g).save(f"icons/icon-{g}.png")
print("Icons erzeugt")
