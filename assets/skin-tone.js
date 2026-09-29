/*
  <skin-tone-image> (snippets/skin-tone-image.liquid): a product photo of a ring on a hand,
  with a vertical skin-tone slider over it. The top gently lightens the skin, the upper
  portion shows the photo as taken, and dragging down moves through deeper skin tones.

  There is only the one photo, so the tone is changed pixel by pixel on a canvas laid over
  it. Each pixel gets a "how much is this skin" weight from its colour: warm hues (reds to
  oranges) with moderate saturation count as skin, while near-greys and whites (the white
  background, diamonds, white gold, silver) and strong yellows (yellow gold) are left
  alone. The slider then adjusts pixels in proportion to that weight, keeping the photo's
  own shading.

  If the photo can't be read (a browser blocking canvas access to it), the slider is hidden
  and the plain photo stays.
*/
(() => {
  if (window.customElements.get('skin-tone-image')) return;

  const MAX_SIZE = 1400; // canvas pixels on the long side: sharp enough, fast enough to redraw

  // The first part of the range gently brightens skin; the rest darkens it while retaining
  // enough green and blue to avoid the overly red, muddy result of equal RGB reduction.
  const NEUTRAL_POINT = 0.22;
  const LIGHTEN = 0.3;
  const DARK = [0.5, 0.46, 0.43];

  const ramp = (x, from, to) => Math.min(1, Math.max(0, (x - from) / (to - from)));

  // 0 = not skin, 1 = skin, from a pixel's colour.
  function skinWeight(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 38 || max === min) return 0;

    const saturation = (max - min) / max;
    const value = max / 255;

    let hue;
    const d = max - min;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;

    // Reds to oranges; fading out before the yellow of yellow gold (~40-50°).
    let hueWeight;
    if (hue <= 30) hueWeight = 1;
    else if (hue < 42) hueWeight = 1 - ramp(hue, 30, 42);
    else if (hue >= 340) hueWeight = ramp(hue, 340, 355);
    else hueWeight = 0;

    // Near-greys (background, diamonds, white metal) and very vivid colours are not skin.
    const saturationWeight = ramp(saturation, 0.08, 0.18) * (1 - ramp(saturation, 0.62, 0.8));
    const valueWeight = ramp(value, 0.15, 0.32);

    return hueWeight * saturationWeight * valueWeight;
  }

  class SkinToneImage extends HTMLElement {
    connectedCallback() {
      this.canvas = this.querySelector('canvas');
      this.input = this.querySelector('input[type="range"]');
      this.control = this.querySelector('.skin-tone__control');
      if (!this.canvas || !this.input || !this.control) return;

      // Dragging the slider must not swipe the gallery or open the zoom.
      ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach((type) => {
        this.control.addEventListener(type, (event) => event.stopPropagation(), { passive: type !== 'click' });
      });

      this.input.addEventListener('input', () => this.schedule());
      this.schedule();
    }

    prepare() {
      if (this.ready) return this.ready;

      this.ready = new Promise((resolve, reject) => {
        const source = new Image();
        source.crossOrigin = 'anonymous';
        source.decoding = 'async';

        source.onload = () => {
          const scale = Math.min(1, MAX_SIZE / Math.max(source.naturalWidth, source.naturalHeight));
          const width = Math.round(source.naturalWidth * scale);
          const height = Math.round(source.naturalHeight * scale);

          this.canvas.width = width;
          this.canvas.height = height;
          this.context = this.canvas.getContext('2d', { willReadFrequently: true });
          this.context.drawImage(source, 0, 0, width, height);

          try {
            this.original = this.context.getImageData(0, 0, width, height);
          } catch (error) {
            reject(error);
            return;
          }

          this.output = this.context.createImageData(width, height);

          const data = this.original.data;
          this.weights = new Float32Array(width * height);
          for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            this.weights[p] = skinWeight(data[i], data[i + 1], data[i + 2]);
          }

          resolve();
        };

        source.onerror = reject;
        source.src = this.getAttribute('source');
      });

      return this.ready;
    }

    schedule() {
      if (this.frame) return;

      this.frame = requestAnimationFrame(async () => {
        this.frame = null;

        try {
          await this.prepare();
        } catch (error) {
          this.classList.add('is-unavailable');
          return;
        }

        this.draw();
      });
    }

    draw() {
      const position = Number(this.input.value) / 100;
      const lightenAmount = position < NEUTRAL_POINT ? 1 - position / NEUTRAL_POINT : 0;
      const darkenAmount = position > NEUTRAL_POINT ? (position - NEUTRAL_POINT) / (1 - NEUTRAL_POINT) : 0;

      const source = this.original.data;
      const target = this.output.data;
      const weights = this.weights;

      for (let i = 0, p = 0; i < source.length; i += 4, p++) {
        const light = lightenAmount * LIGHTEN * weights[p];
        const dark = darkenAmount * weights[p];
        target[i] = (source[i] + (255 - source[i]) * light) * (1 - dark * (1 - DARK[0]));
        target[i + 1] = (source[i + 1] + (255 - source[i + 1]) * light) * (1 - dark * (1 - DARK[1]));
        target[i + 2] = (source[i + 2] + (255 - source[i + 2]) * light) * (1 - dark * (1 - DARK[2]));
        target[i + 3] = source[i + 3];
      }

      this.context.putImageData(this.output, 0, 0);
      this.canvas.hidden = false;
    }
  }

  window.customElements.define('skin-tone-image', SkinToneImage);
})();
