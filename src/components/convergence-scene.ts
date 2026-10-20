import * as THREE from "three";

// Imported only by the public landing page, after the accessible story is visible.
export function mountConvergence(
  canvas: HTMLCanvasElement,
  progress: () => number,
  failed: () => void,
) {
  const mobile = matchMedia("(max-width: 760px)").matches,
    count = mobile ? 700 : 2200;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 22;
  const geometry = new THREE.BufferGeometry(),
    positions = new Float32Array(count * 3),
    scattered = new Float32Array(count * 3),
    targets = new Float32Array(count * 3),
    colors = new Float32Array(count * 3);
  let seed = 73;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const palette = [
    new THREE.Color("#6e8fff"),
    new THREE.Color("#aab5d2"),
    new THREE.Color("#f5d683"),
  ];
  for (let i = 0; i < count; i++) {
    const j = i * 3,
      layer = i % 4;
    scattered[j] = (random() - 0.5) * 29;
    scattered[j + 1] = (random() - 0.5) * 20;
    scattered[j + 2] = (random() - 0.5) * 12;
    targets[j] = (random() - 0.5) * 8 + (layer - 1.5) * 0.48;
    targets[j + 1] = (random() - 0.5) * 5.8 + (layer - 1.5) * 0.55;
    targets[j + 2] = (layer - 1.5) * 0.65;
    const color = palette[i % 3];
    colors[j] = color.r;
    colors[j + 1] = color.g;
    colors[j + 2] = color.b;
  }
  positions.set(scattered);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: mobile ? 0.045 : 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  const particles = new THREE.Points(geometry, material),
    group = new THREE.Group();
  group.add(particles);
  scene.add(group);
  const pathsGeometry = new THREE.BufferGeometry(),
    pathPositions = new Float32Array(48 * 6);
  pathsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(pathPositions, 3),
  );
  const pathMaterial = new THREE.LineBasicMaterial({
    color: "#6787f5",
    transparent: true,
    opacity: 0.15,
  });
  const paths = new THREE.LineSegments(pathsGeometry, pathMaterial);
  group.add(paths);
  const frameMaterial = new THREE.LineBasicMaterial({
    color: "#91a9fa",
    transparent: true,
    opacity: 0,
  });
  const frameGeometries: THREE.BufferGeometry[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const shift = (layer - 1) * 0.45,
      z = (layer - 1) * 0.65;
    const frameGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4 + shift, -2.9 + shift, z),
      new THREE.Vector3(4 + shift, -2.9 + shift, z),
      new THREE.Vector3(4 + shift, 2.9 + shift, z),
      new THREE.Vector3(-4 + shift, 2.9 + shift, z),
    ]);
    frameGeometries.push(frameGeometry);
    group.add(new THREE.LineLoop(frameGeometry, frameMaterial));
  }
  const pointer = new THREE.Vector2();
  const move = (event: PointerEvent) => {
    pointer.set(
      (event.clientX / innerWidth - 0.5) * 2,
      (event.clientY / innerHeight - 0.5) * 2,
    );
  };
  window.addEventListener("pointermove", move, { passive: true });
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  let frame = 0,
    visible = true,
    disposed = false,
    previous = 0;
  function draw(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    frame = requestAnimationFrame(draw);
    if (time - previous < 32) return;
    previous = time;
    const p = Math.max(0, Math.min(1, progress())),
      gather = THREE.MathUtils.smoothstep(p, 0.05, 0.75);
    for (let i = 0; i < count; i++) {
      const j = i * 3,
        drift = (1 - gather) * Math.sin(time * 0.00014 + i * 0.17) * 0.22;
      positions[j] =
        THREE.MathUtils.lerp(scattered[j], targets[j], gather) + drift;
      positions[j + 1] =
        THREE.MathUtils.lerp(scattered[j + 1], targets[j + 1], gather) + drift;
      positions[j + 2] = THREE.MathUtils.lerp(
        scattered[j + 2],
        targets[j + 2],
        gather,
      );
    }
    geometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < 48; i++) {
      const a = (i * 23) % count,
        b = (a + 31) % count;
      for (let k = 0; k < 3; k++) {
        pathPositions[i * 6 + k] = positions[a * 3 + k];
        pathPositions[i * 6 + 3 + k] = positions[b * 3 + k];
      }
    }
    pathsGeometry.attributes.position.needsUpdate = true;
    pathMaterial.opacity = 0.06 + gather * 0.16;
    frameMaterial.opacity = gather * 0.35;
    group.position.set(mobile ? 0 : 4.8, mobile ? -2.1 : 0, 0);
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      pointer.x * 0.07 + (1 - gather) * 0.13,
      0.04,
    );
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      pointer.y * 0.025,
      0.04,
    );
    renderer.render(scene, camera);
  }
  const resume = () => {
    if (!frame && visible && !disposed && !document.hidden)
      frame = requestAnimationFrame(draw);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else resume();
  });
  observer.observe(canvas);
  document.addEventListener("visibilitychange", resume);
  const lost = (event: Event) => {
    event.preventDefault();
    failed();
  };
  canvas.addEventListener("webglcontextlost", lost);
  resume();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", move);
    document.removeEventListener("visibilitychange", resume);
    canvas.removeEventListener("webglcontextlost", lost);
    geometry.dispose();
    pathsGeometry.dispose();
    material.dispose();
    pathMaterial.dispose();
    frameGeometries.forEach((g) => g.dispose());
    frameMaterial.dispose();
    renderer.dispose();
  };
}
