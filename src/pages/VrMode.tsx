/**
 * VR MODE — Imperative Three.js immersive environment (no R3F JSX needed)
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Maximize } from 'lucide-react';
import * as THREE from 'three';
import RxBadge from '@/components/common/RxBadge';

export default function VrMode() {
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x0a0a0f);
    mount.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 2, 8);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);
    const blueLight = new THREE.PointLight(0x00f2ff, 2, 50);
    blueLight.position.set(10, 10, 10);
    scene.add(blueLight);
    const purpleLight = new THREE.PointLight(0xbc13fe, 1.5, 50);
    purpleLight.position.set(-10, -10, -10);
    scene.add(purpleLight);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 }));
    scene.add(stars);

    // Neon grid floor
    const gridGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true, opacity: 0.2, transparent: true });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -3;
    scene.add(grid);

    // Torus rings
    const torusData = [
      { pos: [-3, 0, 0] as [number, number, number], color: 0x00f2ff },
      { pos: [3, 0, 0] as [number, number, number], color: 0xbc13fe },
      { pos: [0, 2, -2] as [number, number, number], color: 0x00ff88 },
    ];
    const toruses = torusData.map(({ pos, color }) => {
      const geo = new THREE.TorusGeometry(1, 0.3, 16, 64);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      return mesh;
    });

    // Floating cubes
    const cubePositions: [number, number, number][] = [[-2, 1, 1], [2, -1, 1], [0, -2, -1], [-1, 2, -2], [1, 1, -3]];
    const cubes = cubePositions.map((pos) => {
      const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0xbc13fe, emissive: 0xbc13fe, emissiveIntensity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      scene.add(mesh);
      return mesh;
    });

    // Central sphere
    const sphereGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, emissive: 0x00f2ff, emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.9 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Orbit controls (manual)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 3, radius: 8 };

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => {
      spherical.radius = Math.max(3, Math.min(20, spherical.radius + e.deltaY * 0.01));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // Touch controls
    let lastTouch = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => { lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      spherical.theta -= dx * 0.005;
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });

    // Resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let frameId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Auto-rotate camera
      if (!isDragging) spherical.theta += 0.003;

      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, 0, 0);

      // Rotate toruses
      toruses.forEach((t, i) => {
        t.rotation.x += (delta + i * 0.01) * 0.5;
        t.rotation.y += (delta + i * 0.01) * 0.3;
      });

      // Float cubes
      cubes.forEach((c, i) => {
        c.rotation.y += 0.01 + i * 0.002;
        c.position.y = cubePositions[i][1] + Math.sin(elapsed * 1.5 + i) * 0.3;
      });

      // Bob sphere
      sphere.position.y = Math.sin(elapsed) * 0.3;

      // Scroll grid
      grid.position.z = (elapsed * 0.5) % 1;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-[#00F2FF]/10 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/gateway')} className="p-2 rounded-lg border border-white/10 hover:border-[#00F2FF]/40 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <RxBadge label="VR" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-widest">VR MODE</h1>
          <p className="text-[10px] text-muted-foreground">Three.js · Immersive Studio</p>
        </div>
        <button
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="border border-white/10 text-xs shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md hover:border-[#00F2FF]/40 transition-colors text-muted-foreground"
        >
          <Maximize className="w-3 h-3" />
          <span className="hidden md:inline">Fullscreen</span>
        </button>
      </div>

      {/* Scene container */}
      <div className="flex-1 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full border border-[#00F2FF]/30 bg-[#0A0A0F]/80 backdrop-blur text-[10px] text-[#00F2FF] whitespace-nowrap pointer-events-none">
          Drag to orbit · Scroll to zoom · Touch to pan
        </motion.div>
        <div ref={mountRef} className="w-full" style={{ height: 'calc(100vh - 60px)' }} />
      </div>
    </div>
  );
}

