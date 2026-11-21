"""Spring cel colours for the three registered opening poses and distant views."""
import numpy as np
from PIL import Image, ImageFilter


def smooth(lo, hi, values):
    t = np.clip((values - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, amount):
    return a + (b-a) * amount[..., None]


def colour(r, g, b):
    return np.array([r, g, b], dtype=np.float32)/255


def light_plate(source, dest, horizon):
    image = Image.open(source).convert('RGB')
    rgb = np.asarray(image, dtype=np.float32)/255
    rows = np.linspace(0, 1, image.height, dtype=np.float32)[:, None]
    field = smooth(horizon-.025, horizon+.025, rows) if horizon else np.ones_like(rows)
    distance = np.zeros_like(rows) if not horizon else 1-smooth(horizon+.05, .78, rows)
    # Smooth pigment and grass grain within like-coloured regions. Strong colour
    # transitions keep the thin silhouettes at their registered locations.
    soft = np.asarray(image.filter(ImageFilter.GaussianBlur(2.3)), dtype=np.float32)/255
    difference = np.max(np.abs(rgb-soft), axis=2)
    flat = mix(rgb, soft, (.57+.34*distance)*(1-smooth(.06, .27, difference)))
    r, g, b = flat.transpose(2, 0, 1)
    lum = .213*r + .715*g + .072*b
    chroma = flat.max(axis=2)-flat.min(axis=2)
    blue = smooth(.025, .095, b-g)*smooth(.045, .13, b-r)*field
    cream = (1-smooth(.065, .20, chroma))*smooth(.52, .78, lum)*field
    warm = smooth(.022, .13, r-g)*smooth(-.08, .05, r-b)*field
    grass = smooth(.012, .13, g-b)*(1-smooth(.01, .15, r-g))*field

    # Spring greens form continuous masses on distant hills, with a little
    # local warmth in the grass tips catching daylight.
    green_shade, green_light = colour(122,177,126), colour(211,230,145)
    greens = mix(green_shade, green_light, smooth(.29, .79, lum))
    result = mix(flat, greens, grass*(.44+.22*distance))
    result = mix(result, flat + (1-flat)*colour(49,37,21), warm*.77)

    # Three broad tones per corolla. Only the brightest lit lip can approach
    # ivory. Most of a blue petal stays distinctly blue even in direct light.
    sun = smooth(.34, .66, lum)
    face = mix(colour(133,149,214), colour(145,197,243), sun)
    face = mix(face, colour(190,219,249), smooth(.65, .87, lum))
    result = mix(result, face, blue*.86)
    whites = mix(colour(183,171,199), colour(246,237,213), smooth(.46, .82, lum))
    result = mix(result, whites, cream*.76)
    local_lum = np.asarray(image.convert('L').filter(ImageFilter.GaussianBlur(2.6)), dtype=np.float32)/255
    upper_left = np.pad(local_lum, ((2, 0), (2, 0)), mode='edge')[:-2, :-2]
    rim = smooth(.065, .18, lum-upper_left)*smooth(.66, .91, lum)
    result = mix(result, colour(255,248,225), rim*np.maximum(blue,cream)*.60)
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.uint8(np.rint(255*np.clip(result, 0, 1)))).save(dest, quality=92, method=5)


def bake_plates(root, out):
    for folder, horizons in [('flight-poses', {'turn':.07, 'hover':.09, 'entry':.10}),
                             ('poses', {'overview':.18, 'side':.35, 'top':0, 'close':.31})]:
        for source in sorted((root/folder).glob('*.webp')):
            shot = source.stem.split('-')[0]
            light_plate(source, out/folder/source.name, horizons[shot])
