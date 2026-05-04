import { Container, Graphics, Renderer, RenderTexture, Texture } from 'pixi.js';

// Each sprite is described as an array of strings; one char = one pixel.
// '.' is always transparent. Other chars look up into the palette map.
export type PixelArt = string[];
export type PaletteMap = Record<string, number>;

// Convert pixel art into a Pixi Texture rendered at native pixel scale.
// We render via a Graphics object with rect() per pixel. Pixi batches these
// into one draw call into the RenderTexture, so it's cheap at startup.
export function pixelsToTexture(
  pixels: PixelArt,
  palette: PaletteMap,
  renderer: Renderer,
): Texture {
  const h = pixels.length;
  const w = Math.max(...pixels.map((row) => row.length));

  const g = new Graphics();
  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      g.rect(x, y, 1, 1).fill({ color, alpha: 1 });
    }
  }

  const rt = RenderTexture.create({
    width: w,
    height: h,
    scaleMode: 'nearest',
    resolution: 1,
  });
  renderer.render({ container: g, target: rt });
  g.destroy();
  rt.source.scaleMode = 'nearest';
  return rt;
}

// Render any container into a RenderTexture so it becomes a single sprite.
// Useful for compound shapes (a building drawn as several Graphics nodes).
export function bakeContainer(
  container: Container,
  width: number,
  height: number,
  renderer: Renderer,
): Texture {
  const rt = RenderTexture.create({
    width,
    height,
    scaleMode: 'nearest',
    resolution: 1,
  });
  renderer.render({ container, target: rt });
  rt.source.scaleMode = 'nearest';
  return rt;
}
