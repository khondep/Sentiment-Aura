// Perlin Noise Implementation
class PerlinNoise {
  constructor(seed = Math.random()) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    this.p = [];
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(Math.random() * 256);
    }
    
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  mix(a, b, t) {
    return (1 - t) * a + t * b;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    return this.mix(
      this.mix(
        this.mix(
          this.dot(this.grad3[this.perm[AA] % 12], x, y, z),
          this.dot(this.grad3[this.perm[BA] % 12], x - 1, y, z),
          u
        ),
        this.mix(
          this.dot(this.grad3[this.perm[AB] % 12], x, y - 1, z),
          this.dot(this.grad3[this.perm[BB] % 12], x - 1, y - 1, z),
          u
        ),
        v
      ),
      this.mix(
        this.mix(
          this.dot(this.grad3[this.perm[AA + 1] % 12], x, y, z - 1),
          this.dot(this.grad3[this.perm[BA + 1] % 12], x - 1, y, z - 1),
          u
        ),
        this.mix(
          this.dot(this.grad3[this.perm[AB + 1] % 12], x, y - 1, z - 1),
          this.dot(this.grad3[this.perm[BB + 1] % 12], x - 1, y - 1, z - 1),
          u
        ),
        v
      ),
      w
    );
  }
}

export default PerlinNoise;