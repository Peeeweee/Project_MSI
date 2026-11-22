import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  SkeletonUtils,
  type OrbitControls as OrbitControlsImpl,
} from 'three-stdlib';
import { SECTION_BY_ID, type SectionId } from '../../data/sections';
import { getMuscleMetadata } from '../../data/muscleMapping';
import {
  VERTEBRATE_BY_ID,
  type AnatomicalSubPart,
  type VertebrateId,
  type VertebrateSpecimen,
} from '../../data/vertebrates';

interface Comparison3DCardCanvasProps {
  vertebrateId: VertebrateId;
  sectionId: SectionId;
  selectedTag: 'A' | 'B' | 'C' | 'D' | null;
  isPlaying: boolean;
  wireframe: boolean;
  onSelectTag: (tag: 'A' | 'B' | 'C' | 'D') => void;
}

interface PinProjectionMap {
  [tag: string]: HTMLButtonElement | null;
}

function projectWorldToCard(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  el: HTMLButtonElement | null,
) {
  if (!el) return;
  const projected = worldPos.clone().project(camera);
  if (projected.z > 1) {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    return;
  }
  const x = (projected.x * 0.5 + 0.5) * width;
  const y = (-projected.y * 0.5 + 0.5) * height;
  const clampedX = Math.max(18, Math.min(width - 18, x));
  const clampedY = Math.max(18, Math.min(height - 18, y));
  el.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0) translate(-50%, -50%)`;
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto';
}

function AnimalCompareRig({
  specimen,
  sectionId,
  selectedTag,
  isPlaying,
  wireframe,
  pinElsRef,
}: {
  specimen: VertebrateSpecimen;
  sectionId: SectionId;
  selectedTag: 'A' | 'B' | 'C' | 'D' | null;
  isPlaying: boolean;
  wireframe: boolean;
  pinElsRef: React.MutableRefObject<PinProjectionMap>;
}) {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { scene: rawScene, animations } = useGLTF(specimen.modelUrl);

  const { clonedScene, normScale, modelCenterY, bonesByName } = useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const sz = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(sz);
    box.getCenter(center);

    const maxDim = Math.max(sz.x, sz.y, sz.z, 0.001);
    const s = specimen.targetSize / maxDim;

    clone.position.set(
      -center.x * s,
      -box.min.y * s + specimen.hoverHeight,
      -center.z * s,
    );
    clone.scale.setScalar(s);
    if (specimen.modelRotationY) {
      clone.rotation.y = specimen.modelRotationY;
    }

    const boneMap = new Map<string, THREE.Object3D>();
    clone.traverse((obj) => {
      if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
        boneMap.set(obj.name, obj);
      }
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        const cloneMat = (m: THREE.Material) => {
          const c = m.clone();
          if (
            c instanceof THREE.MeshStandardMaterial ||
            c instanceof THREE.MeshPhysicalMaterial
          ) {
            c.roughness = Math.min(Math.max(c.roughness, 0.35), 0.72);
            c.metalness = Math.min(c.metalness, 0.16);
          }
          return c;
        };
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(cloneMat)
          : cloneMat(obj.material);
      }
    });

    const cy = (sz.y * s) / 2 + specimen.hoverHeight;
    return {
      clonedScene: clone,
      normScale: s,
      modelCenterY: cy,
      bonesByName: boneMap,
    };
  }, [rawScene, specimen]);

  const { actions } = useAnimations(animations, clonedScene);

  useEffect(() => {
    const clipName =
      specimen.defaultAnimation && actions[specimen.defaultAnimation]
        ? specimen.defaultAnimation
        : Object.keys(actions)[0];
    if (!clipName) return;
    const action = actions[clipName];
    if (action) {
      action.reset().fadeIn(0.2).play();
      action.paused = !isPlaying;
    }
    return () => {
      action?.fadeOut(0.15);
    };
  }, [actions, isPlaying, specimen.defaultAnimation]);

  useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (action && action.isRunning()) {
        action.paused = !isPlaying;
      }
    });
  }, [actions, isPlaying]);

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (
          m instanceof THREE.MeshStandardMaterial ||
          m instanceof THREE.MeshPhysicalMaterial
        ) {
          m.wireframe = wireframe;
          m.transparent = wireframe;
          m.opacity = wireframe ? 0.55 : 1;
          m.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, wireframe]);

  const callout = specimen.callouts[sectionId];
  const parts = callout.parts;
  const selectedPart = useMemo(
    () => (selectedTag ? parts.find((p) => p.tag === selectedTag) ?? null : null),
    [parts, selectedTag],
  );

  const goalPosRef = useRef(new THREE.Vector3());
  const goalTargetRef = useRef(new THREE.Vector3());
  const isTransitioningRef = useRef(true);
  const tempPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    clonedScene.updateMatrixWorld(true);
    let tx = callout.offset[0] * 0.45;
    let ty = modelCenterY + callout.offset[1] * 0.45;
    let tz = callout.offset[2] * 0.45;

    const focusBoneName = selectedPart?.boneName ?? callout.boneName;
    const bone = focusBoneName ? bonesByName.get(focusBoneName) : undefined;
    if (bone) {
      const wp = new THREE.Vector3();
      bone.getWorldPosition(wp);
      if (selectedPart) {
        tx = wp.x + selectedPart.offset[0];
        ty = wp.y + selectedPart.offset[1];
        tz = wp.z + selectedPart.offset[2];
      } else {
        tx = wp.x * 0.6;
        ty = THREE.MathUtils.lerp(modelCenterY, wp.y, 0.65);
        tz = wp.z * 0.6;
      }
    } else if (selectedPart) {
      tx = selectedPart.offset[0];
      ty = modelCenterY + selectedPart.offset[1];
      tz = selectedPart.offset[2];
    }

    const aspect = size.width / Math.max(1, size.height);
    const aspectBoost = aspect < 1.15 ? 1.25 : 1.08;
    const baseDist = selectedPart
      ? Math.max(3.6, callout.focusDist * 0.78)
      : callout.focusDist;
    const dist = baseDist * aspectBoost;
    const rad = (callout.focusYawDeg * Math.PI) / 180;

    goalTargetRef.current.set(tx, ty, tz);
    goalPosRef.current.set(
      tx + Math.sin(rad) * dist,
      ty + callout.focusPitchY * 0.85,
      tz + Math.cos(rad) * dist,
    );
    isTransitioningRef.current = true;
  }, [
    bonesByName,
    callout,
    clonedScene,
    modelCenterY,
    selectedPart,
    size.height,
    size.width,
  ]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const controls = controlsRef.current;

    if (isTransitioningRef.current && controls) {
      camera.position.lerp(goalPosRef.current, Math.min(1, delta * 7));
      controls.target.lerp(goalTargetRef.current, Math.min(1, delta * 7));
      controls.update();
      if (
        camera.position.distanceTo(goalPosRef.current) < 0.02 &&
        controls.target.distanceTo(goalTargetRef.current) < 0.02
      ) {
        isTransitioningRef.current = false;
      }
    }

    clonedScene.updateMatrixWorld(true);
    for (const part of parts) {
      const el = pinElsRef.current[part.tag] ?? null;
      if (!el) continue;
      const bone = part.boneName ? bonesByName.get(part.boneName) : undefined;
      if (bone) {
        bone.getWorldPosition(tempPos);
        tempPos.x += part.offset[0];
        tempPos.y += part.offset[1];
        tempPos.z += part.offset[2];
      } else {
        tempPos.set(
          part.offset[0],
          modelCenterY + part.offset[1],
          part.offset[2],
        );
      }
      projectWorldToCard(tempPos, camera, size.width, size.height, el);
    }
  });

  const accent = SECTION_BY_ID[sectionId].accent;

  return (
    <>
      <ambientLight intensity={1.15} color="#fff3ef" />
      <hemisphereLight args={['#fff5f2', '#38090c', 0.95]} />
      <directionalLight position={[4.5, 6.5, 5.5]} intensity={1.7} color="#fff7f3" />
      <directionalLight position={[-4.5, 2.5, -4.0]} intensity={1.1} color={accent} />

      <group>
        <primitive
          object={clonedScene}
          scale={normScale}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        zoomSpeed={0.9}
        panSpeed={0.7}
        minDistance={2.0}
        maxDistance={15}
        onStart={() => {
          isTransitioningRef.current = false;
        }}
      />
    </>
  );
}

function HumanCompareRig({
  sectionId,
  selectedTag,
  wireframe,
  pinElsRef,
}: {
  sectionId: SectionId;
  selectedTag: 'A' | 'B' | 'C' | 'D' | null;
  wireframe: boolean;
  pinElsRef: React.MutableRefObject<PinProjectionMap>;
}) {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { scene } = useGLTF('./models/muscles.glb');

  const humanCallout = VERTEBRATE_BY_ID.human.callouts[sectionId];
  const parts = humanCallout.parts;
  const selectedPart = useMemo(
    () => (selectedTag ? parts.find((p) => p.tag === selectedTag) ?? null : null),
    [parts, selectedTag],
  );

  const meshes = useMemo(() => {
    const list: Array<{
      id: string;
      geometry: THREE.BufferGeometry;
      material: THREE.MeshStandardMaterial;
      inSection: boolean;
      baseColor: THREE.Color;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }> = [];

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const id = obj.name || obj.parent?.name || '';
      const meta = getMuscleMetadata(id);
      const origMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const baseColor =
        origMat && 'color' in origMat && origMat.color instanceof THREE.Color
          ? origMat.color.clone()
          : new THREE.Color('#b83b32');

      const inSection = meta?.sectionId === sectionId;
      const material = new THREE.MeshStandardMaterial({
        color: inSection ? baseColor.clone() : new THREE.Color('#5a2224'),
        roughness: inSection ? 0.46 : 0.72,
        metalness: 0.05,
        transparent: !inSection,
        opacity: inSection ? 1 : 0.14,
        depthWrite: inSection,
      });

      list.push({
        id: id ?? obj.name,
        geometry: obj.geometry,
        material,
        inSection,
        baseColor,
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      });
    });
    return list;
  }, [scene, sectionId]);

  useEffect(() => {
    const accentColor = new THREE.Color(SECTION_BY_ID[sectionId].accent);
    for (const entry of meshes) {
      const isFocusedMuscle =
        selectedPart?.muscleId !== undefined &&
        entry.id === selectedPart.muscleId;
      entry.material.wireframe = wireframe && entry.inSection;
      if (isFocusedMuscle) {
        entry.material.color.copy(entry.baseColor);
        entry.material.emissive.copy(entry.baseColor).lerp(accentColor, 0.35);
        entry.material.emissiveIntensity = 0.42;
        entry.material.transparent = false;
        entry.material.opacity = 1;
        entry.material.depthWrite = true;
      } else if (entry.inSection) {
        entry.material.color.copy(entry.baseColor);
        entry.material.emissive.set('#000000');
        entry.material.emissiveIntensity = 0.12;
        entry.material.transparent = Boolean(selectedPart?.muscleId);
        entry.material.opacity = selectedPart?.muscleId ? 0.42 : 1;
        entry.material.depthWrite = !selectedPart?.muscleId;
      }
      entry.material.needsUpdate = true;
    }
  }, [meshes, sectionId, selectedPart, wireframe]);

  const goalPosRef = useRef(new THREE.Vector3());
  const goalTargetRef = useRef(new THREE.Vector3());
  const isTransitioningRef = useRef(true);
  const tempPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const tx = selectedPart ? selectedPart.offset[0] * 0.55 : humanCallout.offset[0];
    const ty = selectedPart ? selectedPart.offset[1] : humanCallout.offset[1];
    const tz = selectedPart ? selectedPart.offset[2] * 0.55 : humanCallout.offset[2];

    const dist = selectedPart
      ? Math.max(2.6, humanCallout.focusDist * 0.78)
      : humanCallout.focusDist * 1.05;
    const rad = (humanCallout.focusYawDeg * Math.PI) / 180;

    goalTargetRef.current.set(tx, ty, tz);
    goalPosRef.current.set(
      tx + Math.sin(rad) * dist,
      ty + humanCallout.focusPitchY * 0.5,
      tz + Math.cos(rad) * dist,
    );
    isTransitioningRef.current = true;
  }, [humanCallout, selectedPart]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const controls = controlsRef.current;

    if (isTransitioningRef.current && controls) {
      camera.position.lerp(goalPosRef.current, Math.min(1, delta * 7));
      controls.target.lerp(goalTargetRef.current, Math.min(1, delta * 7));
      controls.update();
      if (
        camera.position.distanceTo(goalPosRef.current) < 0.02 &&
        controls.target.distanceTo(goalTargetRef.current) < 0.02
      ) {
        isTransitioningRef.current = false;
      }
    }

    for (const part of parts) {
      const el = pinElsRef.current[part.tag] ?? null;
      if (!el) continue;
      tempPos.set(part.offset[0], part.offset[1], part.offset[2]);
      projectWorldToCard(tempPos, camera, size.width, size.height, el);
    }
  });

  return (
    <>
      <ambientLight intensity={0.95} color="#fff2ee" />
      <hemisphereLight args={['#fff3ef', '#38090c', 0.88]} />
      <directionalLight position={[4, 6, 5]} intensity={1.55} color="#fff6f2" />
      <directionalLight
        position={[-4, 2, -4]}
        intensity={1.15}
        color={SECTION_BY_ID[sectionId].accent}
      />

      <group>
        {meshes.map((entry) => (
          <mesh
            key={entry.id}
            geometry={entry.geometry}
            material={entry.material}
            position={entry.position}
            rotation={entry.rotation}
            scale={entry.scale}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        zoomSpeed={0.9}
        minDistance={1.5}
        maxDistance={12}
        onStart={() => {
          isTransitioningRef.current = false;
        }}
      />
    </>
  );
}

/**
 * Self-contained interactive 3D vertebrate viewport for each homology comparison card:
 * - Loads the real rigged/animated 3D model from GitHub (`shark.glb`, `teleost.glb`,
 *   `frog.glb`, `crocodile.glb`, `parrot.glb`, `dog.glb`, `horse.glb`, `muscles.glb`)
 * - Projects live 3D bone/part pins (`A`, `B`, `C`, `D`) onto a zero-portal 2D overlay
 *   so clicking a pin or part tab zooms all 4 3D models to that exact homologous part.
 */
export function Comparison3DCardCanvas({
  vertebrateId,
  sectionId,
  selectedTag,
  isPlaying,
  wireframe,
  onSelectTag,
}: Comparison3DCardCanvasProps) {
  const specimen = VERTEBRATE_BY_ID[vertebrateId];
  const section = SECTION_BY_ID[sectionId];
  const parts = specimen.callouts[sectionId].parts;
  const pinElsRef = useRef<PinProjectionMap>({});

  return (
    <div
      data-testid={`compare-3d-viewport-${vertebrateId}`}
      className="relative h-44 w-full overflow-hidden rounded-xl border border-[#ffd9d0]/18 bg-[#180303] shadow-inner sm:h-48"
      style={{
        background: `radial-gradient(circle at 50% 50%, ${section.accent}2e 0%, rgba(36, 5, 6, 0.94) 72%, rgba(18, 2, 3, 1) 100%)`,
      }}
    >
      <Canvas
        key={`${vertebrateId}-${sectionId}`}
        dpr={[1, 1.5]}
        camera={{ position: [2.2, 0.8, 6.2], fov: 34, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          {vertebrateId === 'human' ? (
            <HumanCompareRig
              sectionId={sectionId}
              selectedTag={selectedTag}
              wireframe={wireframe}
              pinElsRef={pinElsRef}
            />
          ) : (
            <AnimalCompareRig
              specimen={specimen}
              sectionId={sectionId}
              selectedTag={selectedTag}
              isPlaying={isPlaying}
              wireframe={wireframe}
              pinElsRef={pinElsRef}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Top-left 3D specimen badge & orbit hint */}
      <div className="pointer-events-none absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full border border-[#ffd9d0]/20 bg-[#1a0303]/85 px-2 py-0.5 text-[10px] font-semibold text-[#fff1ee] backdrop-blur-sm">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: section.accent }}
        />
        <span>3D {specimen.label}</span>
        <span className="text-[9px] text-[#ffd9d0]/60">· Drag to rotate</span>
      </div>

      {/* Bottom-left active part HUD badge inside the 3D viewport */}
      {selectedTag && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex items-center justify-between gap-1.5 rounded-lg border border-[#ffd9d0]/22 bg-[#160202]/88 px-2 py-1 text-[10px] backdrop-blur-sm">
          {(() => {
            const activePart = parts.find((p) => p.tag === selectedTag);
            if (!activePart) return null;
            return (
              <>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: section.accent,
                      color: section.badgeText,
                    }}
                  >
                    {activePart.tag}
                  </span>
                  <span className="truncate font-semibold text-[#fff1ee]">
                    {activePart.label}
                  </span>
                </div>
                <span className="hidden shrink-0 text-[9px] text-[#ffd9d0]/70 sm:inline">
                  {activePart.origin.split('·')[0]}
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* Zero-portal 2D projected anatomical pins (A, B, C, D) tracked live to 3D bones */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {parts.map((part: AnatomicalSubPart) => {
          const isSelected = selectedTag === part.tag;
          return (
            <button
              key={part.id}
              ref={(el) => {
                pinElsRef.current[part.tag] = el;
              }}
              type="button"
              data-testid={`compare-pin-${vertebrateId}-${part.tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTag(part.tag);
              }}
              title={`${part.tag}. ${part.label} (${part.origin})`}
              style={{
                left: 0,
                top: 0,
                opacity: 0,
                zIndex: isSelected ? 30 : 12,
                backgroundColor: isSelected
                  ? '#fff1ee'
                  : 'rgba(20, 3, 4, 0.88)',
                borderColor: isSelected ? section.accent : `${section.accent}cc`,
                color: isSelected ? '#240505' : '#fff1ee',
                boxShadow: isSelected
                  ? `0 0 0 3px ${section.accent}66, 0 0 16px ${section.accent}`
                  : '0 3px 8px rgba(0,0,0,0.6)',
              }}
              className={`hud-btn absolute flex h-5 w-5 items-center justify-center rounded-full border-2 font-mono-num text-[9.5px] font-bold transition-colors ${
                isSelected ? 'scale-125' : 'hover:scale-110'
              }`}
            >
              {part.tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
