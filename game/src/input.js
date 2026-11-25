// Dapur Kilat — keyboard and mouse input, translated into one frame of intent.
// The game reads only this object: held keys, a fresh interact press, and clicks.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.interactPressed = false;
    this.restartPressed = false;
    this.mutePressed = false;
    this.startPressed = false;
    this.click = null; // { x, y } in canvas pixels, consumed by main
    this.mouse = { x: 0, y: 0 };

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(key);
      if (key === 'e' || key === ' ') this.interactPressed = true;
      if (key === 'r') this.restartPressed = true;
      if (key === 'm') this.mutePressed = true;
      if (key === 'enter') this.startPressed = true;
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.click = { x, y };
      this.mouse = { x, y };
    });
    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse = {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    });
  }

  /** Normalised WASD / arrow movement vector for this frame. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  takeClick() {
    const click = this.click;
    this.click = null;
    return click;
  }

  takeInteract() {
    const pressed = this.interactPressed;
    this.interactPressed = false;
    return pressed;
  }

  takeRestart() {
    const pressed = this.restartPressed;
    this.restartPressed = false;
    return pressed;
  }

  takeMute() {
    const pressed = this.mutePressed;
    this.mutePressed = false;
    return pressed;
  }

  takeStart() {
    const pressed = this.startPressed;
    this.startPressed = false;
    return pressed;
  }
}
