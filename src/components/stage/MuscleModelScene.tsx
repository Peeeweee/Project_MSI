import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SECTION_BY_ID, type SectionId } from '../../data/sections';
import {
  getMuscleMetadata,
  type MuscleMetadata,
} from '../../data/muscleMapping';
import {
  VERTEBRATE_BY_ID,
  type AnatomicalSubPart,
} from '../../data/vertebrates';

export type CameraAnglePreset = 'anterior' | 'posterior' | 'lateral';

export interface MuscleModelSceneProps {
  activeSectionId: SectionId | null;
  selectedSubPartId: string | null;
  showLabels: boolean;
  anglePreset: CameraAnglePreset;
  xrayFocus: boolean;
  autoOrbit: boolean;
  reducedMotion: boolean;
  resetTrigger: number;
  selectedMuscleId: string | null;
  hoveredMuscleId: string | null;
  onHoverMuscle: (muscle: MuscleMetadata | null) => void;
  onSelectMuscle: (muscle: MuscleMetadata | null) => void;
  onSelectSubPart: (part: AnatomicalSubPart) => void;
  onUserOrbitStart?: () => void;
}

export const MUSCLES_GLB_URL = './models/muscles.glb';

interface CameraGoal {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Curated anatomical camera framing for the 177-muscle BodyParts3D figure
 * (Y bounds: -3.29 feet to +3.29 crown, facing +Z).
 */
function getCameraGoal(
  sectionId: SectionId | null,
  angle: CameraAnglePreset,
): CameraGoal {
  let target: [number, number, number];
  let dist: number;
  let yawDeg: number;
  let elevOffset: number;

  switch (sectionId) {
    case 'axial':
      target = [0, 1.02, 0];
      dist = 5.85;
      yawDeg = angle === 'anterior' ? 16 : angle === 'posterior' ? 164 : 84;
      elevOffset = 0.25;
      break;
    case 'appendicular':
      target = [0, -0.25, 0];
      dist = 10.6;
      yawDeg = angle === 'anterior' ? -15 : angle === 'posterior' ? 195 : 86;
      elevOffset = 0.28;
      break;
    case 'hypobranchial':
      target = [0, 2.34, 0.04];
      dist = 3.25;
      yawDeg = angle === 'anterior' ? 18 : angle === 'posterior' ? 164 : 74;
      elevOffset = 0.08;
      break;
    case 'branchiomeric':
      target = [0, 2.48, 0.02];
      dist = 3.5;
      yawDeg = angle === 'anterior' ? 24 : angle === 'posterior' ? 156 : 82;
      elevOffset = 0.14;
      break;
    default:
      target = [0, -0.14, 0];
      dist = 11.85;
      yawDeg = angle === 'anterior' ? 10 : angle === 'posterior' ? 172 : 86;
      elevOffset = 0.2;
      break;
  }

  const rad = (yawDeg * Math.PI) / 180;
  return {
    target,
    position: [
      target[0] + Math.sin(rad) * dist,
      target[1] + elevOffset,
      target[2] + Math.cos(rad) * dist,
    ],
  };
}

const GHOST_COLOR = new THREE.Color('#8c5659');
const MUTED_SOLID_COLOR = new THREE.Color('#4a2427');
const BLACK_COLOR = new THREE.Color('#000000');

interface PreparedMeshEntry {
  id: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  meta: MuscleMetadata | undefined;
  baseColor: THREE.Color;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export function MuscleModelScene({
  activeSectionId,
  selectedSubPartId,
  showLabels,
  anglePreset,
  xrayFocus,
  autoOrbit,
  reducedMotion,
  resetTrigger,
  selectedMuscleId,
  hoveredMuscleId,
  onHoverMuscle,
  onSelectMuscle,
  onSelectSubPart,
  onUserOrbitStart,
}: MuscleModelSceneProps) {
  const { scene } = useGLTF(MUSCLES_GLB_URL);
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const rigRef = useRef<THREE.Group | null>(null);

  // Camera transition goal state (yields immediately when user grabs OrbitControls)
  const isTransitioningRef = useRef(true);
  const goalPosRef = useRef(new THREE.Vector3(1.8, 0.35, 10.4));
  const goalTargetRef = useRef(new THREE.Vector3(0, 0.08, 0));
  const entranceRef = useRef(reducedMotion ? 1 : 0);

  // Extract all 177 meshes cleanly and clone per-mesh PBR materials so state updates never mutate cache
  const meshes = useMemo<PreparedMeshEntry[]>(() => {
    const list: PreparedMeshEntry[] = [];
    scene.updateMatrixWorld(true);

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const id = obj.name || obj.parent?.name || '';
      if (!id) return;

      const meta = getMuscleMetadata(id);
      const srcMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const baseColor = new THREE.Color(
        meta?.baseColor ??
          (srcMat && 'color' in srcMat && srcMat.color instanceof THREE.Color
            ? `#${srcMat.color.getHexString()}`
            : '#b5464b'),
      );

      const material = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        roughness: 0.52,
        metalness: 0.05,
        emissive: new THREE.Color('#000000'),
        emissiveIntensity: 0,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      });

      list.push({
        id,
        geometry: obj.geometry,
        material,
        meta,
        baseColor,
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      });
    });

    return list;
  }, [scene]);

  // Dispose cloned materials cleanly on unmount
  useEffect(() => {
    return () => {
      for (const entry of meshes) {
        entry.material.dispose();
      }
    };
  }, [meshes]);

  // Update camera goal whenever active section, angle preset, or manual reset changes
  useEffect(() => {
    const goal = getCameraGoal(activeSectionId, anglePreset);
    const aspect = size.width / Math.max(1, size.height);
    const portraitBoost = aspect < 0.85 ? 1.18 : 1;
    const tx = goal.target[0];
    const ty = goal.target[1];
    const tz = goal.target[2];
    goalTargetRef.current.set(tx, ty, tz);
    goalPosRef.current.set(
      tx + (goal.position[0] - tx) * portraitBoost,
      ty + (goal.position[1] - ty) * portraitBoost,
      tz + (goal.position[2] - tz) * portraitBoost,
    );

    if (reducedMotion) {
      camera.position.copy(goalPosRef.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(goalTargetRef.current);
        controlsRef.current.update();
      }
      isTransitioningRef.current = false;
    } else {
      isTransitioningRef.current = true;
    }
  }, [
    activeSectionId,
    anglePreset,
    camera,
    reducedMotion,
    resetTrigger,
    size.height,
    size.width,
  ]);

  // Synchronize material appearance (realistic flesh, tasteful CVA section focus, X-ray ghosting, selection)
  useEffect(() => {
    const tempColor = new THREE.Color();

    for (const entry of meshes) {
      const mat = entry.material;
      const sectionId = entry.meta?.sectionId;
      const accentHex = sectionId ? SECTION_BY_ID[sectionId].accent : '#ffd9d0';
      const accentColor = new THREE.Color(accentHex);

      const isSelected = selectedMuscleId === entry.id;
      const isHovered = hoveredMuscleId === entry.id;
      const inActiveSection =
        activeSectionId === null || sectionId === activeSectionId;

      if (selectedMuscleId !== null) {
        // Individual muscle inspection focus (preserve authentic realistic muscle tones)
        if (isSelected) {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(entry.baseColor).lerp(accentColor, 0.25);
          mat.emissiveIntensity = 0.36;
          mat.roughness = 0.42;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        } else if (isHovered && inActiveSection) {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(entry.baseColor);
          mat.emissiveIntensity = 0.24;
          mat.roughness = 0.46;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        } else if (inActiveSection) {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(BLACK_COLOR);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.58;
          mat.transparent = true;
          mat.opacity = 0.34;
          mat.depthWrite = false;
        } else {
          mat.color.copy(GHOST_COLOR);
          mat.emissive.copy(BLACK_COLOR);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.72;
          mat.transparent = true;
          mat.opacity = 0.1;
          mat.depthWrite = false;
        }
      } else if (activeSectionId !== null) {
        // CVA Section Focus: realistic natural muscle tissue illuminated against X-Ray shell
        if (inActiveSection) {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(entry.baseColor);
          mat.emissiveIntensity = isHovered ? 0.34 : 0.14;
          mat.roughness = isHovered ? 0.42 : 0.48;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        } else if (xrayFocus) {
          // Translucent anatomical shell so deep hypobranchial/axial muscles read clearly
          mat.color.copy(GHOST_COLOR);
          mat.emissive.copy(BLACK_COLOR);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.7;
          mat.transparent = true;
          mat.opacity = activeSectionId === 'hypobranchial' ? 0.12 : 0.15;
          mat.depthWrite = false;
        } else {
          // Solid muted silhouette
          tempColor.copy(entry.baseColor).lerp(MUTED_SOLID_COLOR, 0.74);
          mat.color.copy(tempColor);
          mat.emissive.copy(BLACK_COLOR);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.68;
          mat.transparent = false;
          mat.opacity = 1;
          mat.depthWrite = true;
        }
      } else {
        // Full-Body Overview: natural realistic anatomical musculature
        if (isHovered) {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(entry.baseColor).lerp(accentColor, 0.2);
          mat.emissiveIntensity = 0.32;
          mat.roughness = 0.44;
        } else {
          mat.color.copy(entry.baseColor);
          mat.emissive.copy(BLACK_COLOR);
          mat.emissiveIntensity = 0;
          mat.roughness = 0.52;
        }
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
      }

      mat.needsUpdate = true;
    }
  }, [activeSectionId, hoveredMuscleId, meshes, selectedMuscleId, xrayFocus]);

  // Smooth framerate-independent camera glide + gentle entrance settle
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    // Subtle, architectural model entrance settle (0.965 -> 1.0, restrained 0.12 rad settle)
    if (rigRef.current && entranceRef.current < 1) {
      entranceRef.current = THREE.MathUtils.damp(entranceRef.current, 1, 5.2, delta);
      if (1 - entranceRef.current < 0.001) entranceRef.current = 1;
      const p = entranceRef.current;
      const s = 0.965 + p * 0.035;
      rigRef.current.scale.setScalar(s);
      rigRef.current.rotation.y = (1 - p) * -0.14;
    }

    const controls = controlsRef.current;
    if (isTransitioningRef.current && controls) {
      const speed = 5.4;
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        goalPosRef.current.x,
        speed,
        delta,
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        goalPosRef.current.y,
        speed,
        delta,
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        goalPosRef.current.z,
        speed,
        delta,
      );

      controls.target.x = THREE.MathUtils.damp(
        controls.target.x,
        goalTargetRef.current.x,
        speed,
        delta,
      );
      controls.target.y = THREE.MathUtils.damp(
        controls.target.y,
        goalTargetRef.current.y,
        speed,
        delta,
      );
      controls.target.z = THREE.MathUtils.damp(
        controls.target.z,
        goalTargetRef.current.z,
        speed,
        delta,
      );

      controls.update();

      const posDist = camera.position.distanceTo(goalPosRef.current);
      const tgtDist = controls.target.distanceTo(goalTargetRef.current);
      if (posDist < 0.008 && tgtDist < 0.008) {
        camera.position.copy(goalPosRef.current);
        controls.target.copy(goalTargetRef.current);
        controls.update();
        isTransitioningRef.current = false;
      }
    }
  });

  const activeAccentHex = activeSectionId
    ? SECTION_BY_ID[activeSectionId].accent
    : '#ffd9d0';

  return (
    <>
      {/* Studio Anatomical Lighting tailored for deep-maroon background & realistic muscle fibers */}
      <ambientLight intensity={0.62} color="#ffeae5" />
      <hemisphereLight args={['#fff6ee', '#4c1418', 1.35]} />
      {/* Warm sculptural key light */}
      <directionalLight
        position={[-4.5, 6.5, 6.2]}
        intensity={2.45}
        color="#fff3e6"
      />
      {/* Cool anatomical edge/rim separation light */}
      <directionalLight
        position={[5.2, 2.2, -4.8]}
        intensity={1.65}
        color="#d9e7ff"
      />
      {/* Subtle warm maroon under-fill */}
      <directionalLight
        position={[-3.2, -3.5, 2.0]}
        intensity={0.55}
        color="#ffd0c7"
      />
      {/* Delicate section-tinted rim highlight */}
      <pointLight
        position={[0, 2.4, -3.4]}
        intensity={activeSectionId ? 1.8 : 0.7}
        distance={11}
        color={activeAccentHex}
      />

      {/* Interactive 177-Muscle Anatomical Figure */}
      <group
        ref={rigRef}
        onPointerMissed={() => {
          onSelectMuscle(null);
        }}
      >
        {meshes.map((entry) => {
          const isGhostedPassThrough =
            activeSectionId !== null &&
            xrayFocus &&
            entry.meta?.sectionId !== activeSectionId;

          const handleOver = (e: ThreeEvent<PointerEvent>) => {
            if (isGhostedPassThrough) return;
            e.stopPropagation();
            if (entry.meta) {
              onHoverMuscle(entry.meta);
            }
            document.body.style.cursor = 'pointer';
          };

          const handleOut = (e: ThreeEvent<PointerEvent>) => {
            if (isGhostedPassThrough) return;
            e.stopPropagation();
            onHoverMuscle(null);
            document.body.style.cursor = '';
          };

          const handleClick = (e: ThreeEvent<MouseEvent>) => {
            if (isGhostedPassThrough) return;
            e.stopPropagation();
            if (entry.meta) {
              onSelectMuscle(
                selectedMuscleId === entry.id ? null : entry.meta,
              );
            }
          };

          return (
            <mesh
              key={entry.id}
              name={entry.id}
              geometry={entry.geometry}
              material={entry.material}
              position={entry.position}
              rotation={entry.rotation}
              scale={entry.scale}
              renderOrder={isGhostedPassThrough ? 1 : 2}
              onPointerOver={handleOver}
              onPointerOut={handleOut}
              onClick={handleClick}
            />
          );
        })}

        {/* Grounded Architectural Anatomical Plinth beneath feet (y = -3.32) */}
        <group position={[0, -3.34, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.45, 64]} />
            <meshBasicMaterial
              color="#140202"
              transparent
              opacity={0.58}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[1.38, 1.43, 64]} />
            <meshBasicMaterial
              color={activeAccentHex}
              transparent
              opacity={0.34}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[1.76, 1.78, 64]} />
            <meshBasicMaterial
              color="#ffd9d0"
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* Precise Human Anatomical Leader-Line Labels when a CVA Section is Focused */}
        {showLabels &&
          activeSectionId &&
          VERTEBRATE_BY_ID.human.callouts[activeSectionId].parts.map((part) => {
            const sec = SECTION_BY_ID[activeSectionId];
            const isSelected =
              selectedSubPartId === part.id ||
              (part.muscleId !== undefined && selectedMuscleId === part.muscleId);
            const isCompact = size.width < 640;
            const shiftScale = isCompact ? 0.35 : 1;
            const dx = Math.round(part.calloutShift[0] * shiftScale);
            const dy = Math.round(part.calloutShift[1] * shiftScale);
            const alignLeft = dx < 0;

            return (
              <group key={part.id} position={[part.offset[0], part.offset[1], part.offset[2]]}>
                <Html
                  center
                  zIndexRange={[isSelected ? 22 : 16, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="relative h-0 w-0 select-none">
                    <span
                      className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border"
                      style={{
                        backgroundColor: isSelected ? '#fff1ee' : sec.accent,
                        borderColor: '#fff1ee',
                        boxShadow: `0 0 10px ${sec.accent}`,
                      }}
                    />
                    <svg
                      className="pointer-events-none absolute left-0 top-0 overflow-visible"
                      width="1"
                      height="1"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2={dx}
                        y2={dy}
                        stroke={isSelected ? '#fff1ee' : sec.accent}
                        strokeOpacity={isSelected ? 0.95 : 0.76}
                        strokeWidth={isSelected ? 1.8 : 1.3}
                      />
                    </svg>
                    <button
                      type="button"
                      data-testid={`subpart-pin-${part.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubPart(part);
                      }}
                      style={{
                        left: `${dx}px`,
                        top: `${dy}px`,
                        transform: isCompact
                          ? 'translate(-50%, -50%)'
                          : alignLeft
                            ? 'translate(-100%, -50%)'
                            : 'translate(0%, -50%)',
                        backgroundColor: isSelected
                          ? 'rgba(46, 8, 10, 0.96)'
                          : 'rgba(26, 4, 5, 0.88)',
                        borderColor: isSelected ? '#fff1ee' : `${sec.accent}cc`,
                        boxShadow: isSelected
                          ? `0 0 18px ${sec.accent}88`
                          : '0 6px 16px rgba(0,0,0,0.45)',
                      }}
                      className={`pointer-events-auto absolute flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 text-[11px] font-semibold text-[#fff1ee] backdrop-blur-md transition-transform hover:scale-[1.04] ${
                        isCompact && !isSelected ? 'px-0.5' : 'pl-1 pr-2.5'
                      }`}
                    >
                      <span
                        className="font-mono-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-4 sm:w-4 sm:text-[9px]"
                        style={{
                          backgroundColor: isSelected ? '#fff1ee' : sec.accent,
                          color: isSelected ? '#3b0a0a' : sec.badgeText,
                        }}
                      >
                        {part.tag}
                      </span>
                      <span
                        className={`font-display tracking-wide ${
                          isCompact && !isSelected
                            ? 'hidden'
                            : 'max-w-[130px] truncate sm:max-w-none'
                        }`}
                      >
                        {part.label}
                      </span>
                    </button>
                  </div>
                </Html>
              </group>
            );
          })}
      </group>

      {/* Smooth Damped Orbit Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.78}
        zoomSpeed={0.9}
        panSpeed={0.75}
        minDistance={1.15}
        maxDistance={15.5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.18}
        autoRotate={autoOrbit && !reducedMotion}
        autoRotateSpeed={0.85}
        onStart={() => {
          isTransitioningRef.current = false;
          onUserOrbitStart?.();
        }}
      />
    </>
  );
}

useGLTF.preload(MUSCLES_GLB_URL);
