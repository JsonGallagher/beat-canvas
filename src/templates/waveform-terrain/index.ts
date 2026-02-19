import * as THREE from "three";
import type { TemplateModule, RenderContext, ReactiveInput, TemplateControl } from "@/types/template";

const GRID_X = 80;
const GRID_Z = 80;

class WaveformTerrain implements TemplateModule {
  id = "waveform-terrain";
  name = "Waveform Terrain";
  tags = ["terrain", "data"];

  private mesh: THREE.Mesh | null = null;
  private wireframe: THREE.LineSegments | null = null;
  private wirePositions: Float32Array | null = null;
  private historyRows: Float32Array[] = [];
  private time = 0;
  private scrollAcc = 0;
  private ampSmooth = 0;

  init(ctx: RenderContext) {
    const geometry = new THREE.PlaneGeometry(10, 16, GRID_X - 1, GRID_Z - 1);
    geometry.rotateX(-Math.PI * 0.42);

    // Invisible solid mesh (just for structure)
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = -1;
    ctx.scene.add(this.mesh);

    // Wireframe: build our own line segments from the grid
    // This avoids recreating WireframeGeometry every frame
    const wireGeo = this._buildWireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.wireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.wireframe.position.y = -1;
    ctx.scene.add(this.wireframe);

    // Initialize history
    for (let z = 0; z < GRID_Z; z++) {
      this.historyRows.push(new Float32Array(GRID_X));
    }
  }

  /** Build line segments for the grid once — we'll update positions in-place */
  private _buildWireframeGeometry(planeGeo: THREE.PlaneGeometry): THREE.BufferGeometry {
    // Horizontal lines + vertical lines = line segments
    const hLines = GRID_Z * (GRID_X - 1); // horizontal
    const vLines = GRID_X * (GRID_Z - 1); // vertical
    const totalSegments = hLines + vLines;
    const positions = new Float32Array(totalSegments * 2 * 3); // 2 vertices per segment

    // Copy initial positions from the plane — we'll update later
    const planePos = planeGeo.attributes.position as THREE.BufferAttribute;
    let idx = 0;

    // Horizontal segments (row by row)
    for (let z = 0; z < GRID_Z; z++) {
      for (let x = 0; x < GRID_X - 1; x++) {
        const i1 = z * GRID_X + x;
        const i2 = z * GRID_X + x + 1;
        positions[idx++] = planePos.getX(i1);
        positions[idx++] = planePos.getY(i1);
        positions[idx++] = planePos.getZ(i1);
        positions[idx++] = planePos.getX(i2);
        positions[idx++] = planePos.getY(i2);
        positions[idx++] = planePos.getZ(i2);
      }
    }

    // Vertical segments (column by column)
    for (let x = 0; x < GRID_X; x++) {
      for (let z = 0; z < GRID_Z - 1; z++) {
        const i1 = z * GRID_X + x;
        const i2 = (z + 1) * GRID_X + x;
        positions[idx++] = planePos.getX(i1);
        positions[idx++] = planePos.getY(i1);
        positions[idx++] = planePos.getZ(i1);
        positions[idx++] = planePos.getX(i2);
        positions[idx++] = planePos.getY(i2);
        positions[idx++] = planePos.getZ(i2);
      }
    }

    this.wirePositions = positions;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }

  update(_ctx: RenderContext, input: ReactiveInput, delta: number) {
    if (!this.mesh || !this.wireframe || !this.wirePositions) return;

    this.time += delta;
    const { frame, intensityMultiplier, palette, params } = input;
    const amp = frame.amplitude * intensityMultiplier;
    const bass = frame.bass * intensityMultiplier;
    const mid = frame.mid * intensityMultiplier;
    const treble = frame.treble * intensityMultiplier;

    this.ampSmooth += (amp - this.ampSmooth) * 0.12;

    const scrollSpeed = 0.3 + Number(params.scrollSpeed ?? 0.5) * 0.7;
    const heightScale = 0.5 + Number(params.heightScale ?? 0.5) * 2;

    // Scroll accumulator — shift rows when enough time passes
    this.scrollAcc += delta * scrollSpeed * (1 + bass * 2);
    const scrollStep = 0.033; // ~30 rows per second at speed 1

    while (this.scrollAcc >= scrollStep) {
      this.scrollAcc -= scrollStep;

      // Shift history rows
      for (let z = GRID_Z - 1; z > 0; z--) {
        const prev = this.historyRows[z - 1];
        const curr = this.historyRows[z];
        if (prev && curr) curr.set(prev);
      }

      // Generate new front row from FFT bands
      const frontRow = this.historyRows[0];
      if (frontRow) {
        for (let x = 0; x < GRID_X; x++) {
          const xNorm = x / GRID_X;
          let height = 0;

          // Smooth frequency regions
          if (xNorm < 0.3) {
            const localX = xNorm / 0.3;
            height = bass * (0.5 + Math.sin(localX * Math.PI) * 0.5);
          } else if (xNorm < 0.65) {
            const localX = (xNorm - 0.3) / 0.35;
            height = mid * (0.5 + Math.sin(localX * Math.PI) * 0.5);
          } else {
            const localX = (xNorm - 0.65) / 0.35;
            height = treble * (0.5 + Math.sin(localX * Math.PI) * 0.5);
          }

          // Add some per-column variation
          height += Math.sin(x * 0.3 + this.time * 2) * amp * 0.15;
          frontRow[x] = height * heightScale;
        }
      }
    }

    // Apply heights to mesh geometry
    const meshPos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let z = 0; z < GRID_Z; z++) {
      const row = this.historyRows[z];
      if (!row) continue;
      for (let x = 0; x < GRID_X; x++) {
        const i = z * GRID_X + x;
        const height = row[x] ?? 0;
        meshPos.setZ(i, height);
      }
    }
    meshPos.needsUpdate = true;

    // Update wireframe positions in-place (no geometry recreation!)
    let idx = 0;

    // Horizontal segments
    for (let z = 0; z < GRID_Z; z++) {
      for (let x = 0; x < GRID_X - 1; x++) {
        const i1 = z * GRID_X + x;
        const i2 = z * GRID_X + x + 1;
        this.wirePositions[idx++] = meshPos.getX(i1);
        this.wirePositions[idx++] = meshPos.getY(i1);
        this.wirePositions[idx++] = meshPos.getZ(i1);
        this.wirePositions[idx++] = meshPos.getX(i2);
        this.wirePositions[idx++] = meshPos.getY(i2);
        this.wirePositions[idx++] = meshPos.getZ(i2);
      }
    }

    // Vertical segments
    for (let x = 0; x < GRID_X; x++) {
      for (let z = 0; z < GRID_Z - 1; z++) {
        const i1 = z * GRID_X + x;
        const i2 = (z + 1) * GRID_X + x;
        this.wirePositions[idx++] = meshPos.getX(i1);
        this.wirePositions[idx++] = meshPos.getY(i1);
        this.wirePositions[idx++] = meshPos.getZ(i1);
        this.wirePositions[idx++] = meshPos.getX(i2);
        this.wirePositions[idx++] = meshPos.getY(i2);
        this.wirePositions[idx++] = meshPos.getZ(i2);
      }
    }

    this.wireframe.geometry.attributes.position!.needsUpdate = true;

    // Color and opacity
    const color = new THREE.Color(palette[0] ?? "#00FF41");
    const mat = this.wireframe.material as THREE.LineBasicMaterial;
    const brightness = 0.3 + this.ampSmooth * 0.7;
    mat.color.copy(color).multiplyScalar(brightness);
    mat.opacity = 0.3 + this.ampSmooth * 0.5;
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.wireframe) {
      this.wireframe.geometry.dispose();
      (this.wireframe.material as THREE.Material).dispose();
    }
    this.mesh = null;
    this.wireframe = null;
    this.wirePositions = null;
    this.historyRows = [];
  }

  getControlsSchema(): TemplateControl[] {
    return [
      { id: "scrollSpeed", label: "Scroll Speed", type: "slider", default: 0.5, min: 0.1, max: 1, step: 0.01 },
      { id: "heightScale", label: "Height Scale", type: "slider", default: 0.6, min: 0.1, max: 1, step: 0.01 },
    ];
  }
}

export default new WaveformTerrain();
