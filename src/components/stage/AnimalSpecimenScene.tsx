import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils, type OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SECTION_BY_ID, SECTIONS, type SectionId } from '../../data/sections';
import type { AnatomicalSubPart, VertebrateSpecimen } from '../../data/vertebrates';
import type { CameraAnglePreset } from './MuscleModelScene';

export interface AnimalSpecimenSceneProps {
  specimen: VertebrateSpecimen;
  activeSectionId: SectionId | null;
  selectedSubPartId: string | null;
  showLabels: boolean;
  anglePreset: CameraAnglePreset;
  activeAnimation: string | null;
  isPlaying: boolean;
  wireframeOverlay: boolean;
  autoOrbit: boolean;
  reducedMotion: boolean;
  resetTrigger: number;
  onSelectSection: (id: SectionId) => void;
  onSelectSubPart: (part: AnatomicalSubPart) => void;
  onUserOrbitStart?: () => void;
}

const PLINTH_Y = -1.65;

export function AnimalSpecimenScene({
  specimen,
  activeSectionId,
  selectedSubPartId,
  showLabels,
  anglePreset,
  activeAnimation,
  isPlaying,
  wireframeOverlay,
  autoOrbit,
  reducedMotion,
  resetTrigger,
  onSelectSection,
  onSelectSubPart,
  onUserOrbitStart,
}: AnimalSpecimenSceneProps) {
  const { scene: rawScene, animations } = useGLTF(specimen.modelUrl);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const rigRef = useRef<THREE.Group | null>(null);
  const floatRef = useRef<THREE.Group | null>(null);

  const isTransitioningRef = useRef(true);
  const goalPosRef = useRef(new THREE.Vector3(4.5, 1.1, 4.8));
  const goalTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const entranceRef = useRef(reducedMotion ? 1 : 0);

  // Refs for the 4 overview zone beacon groups (shown when activeSectionId === null)
  const zonePinRefs = useRef<Record<SectionId, THREE.Group | null>>({
    axial: null,
    appendicular: null,
    hypobranchial: null,
    branchiomeric: null,
  });

  // Refs for the precise animal-specific anatomical sub-part beacons (shown when activeSectionId !== null)
  const subPartRefs = useRef<Record<string, THREE.Group | null>>({});

  // Clone skeleton safely so SkinnedMesh animations never collide or break on remount
  const { clonedScene, normScale, normOffset, modelCenterY, bonesByName } = useMemo(() => {
    const clone = SkeletonUtils.clone(rawScene);
    clone.updateMatrixWorld(true);

    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else if (obj.material) {
          obj.material = obj.material.clone();
        }
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = specimen.targetSize / maxDim;

    const isMorphFlier = specimen.id === 'parrot';
    const targetCenterY = isMorphFlier
      ? PLINTH_Y + 1.15
      : PLINTH_Y + specimen.hoverHeight + size.y * scale * 0.5;

    const offset: [number, number, number] = [
      -center.x * scale,
      isMorphFlier
        ? targetCenterY - center.y * scale - 0.15
        : -box.min.y * scale + PLINTH_Y + specimen.hoverHeight,
      -center.z * scale,
    ];

    const boneMap = new Map<string, THREE.Object3D>();
    clone.traverse((obj) => {
      if (obj.name) {
        boneMap.set(obj.name, obj);
      }
    });

    return {
      clonedScene: clone,
      normScale: scale,
      normOffset: offset,
      modelCenterY: targetCenterY,
      bonesByName: boneMap,
    };
  }, [rawScene, specimen.hoverHeight, specimen.id, specimen.targetSize]);

  useEffect(() => {
    return () => {
      clonedScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
    };
  }, [clonedScene]);

  const { actions } = useAnimations(animations, clonedScene);

  useEffect(() => {
    const clipName =
      activeAnimation && actions[activeAnimation]
        ? activeAnimation
        : specimen.defaultAnimation && actions[specimen.defaultAnimation]
          ? specimen.defaultAnimation
          : Object.keys(actions)[0];

    if (!clipName) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (!action) return;
      if (name === clipName) {
        action.reset().fadeIn(0.32).play();
        action.paused = !isPlaying;
      } else {
        action.fadeOut(0.25);
      }
    });

    return () => {
      Object.values(actions).forEach((action) => action?.fadeOut(0.2));
    };
  }, [actions, activeAnimation, isPlaying, specimen.defaultAnimation]);

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
          m.wireframe = wireframeOverlay;
          m.transparent = wireframeOverlay;
          m.opacity = wireframeOverlay ? 0.52 : 1;
          m.roughness = wireframeOverlay ? 0.35 : 0.56;
          m.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, wireframeOverlay]);

  useEffect(() => {
    entranceRef.current = reducedMotion ? 1 : 0;
  }, [specimen.id, reducedMotion]);

  // Compute target camera goal for overview or focused CVA anatomical zone
  useEffect(() => {
    const centerY = modelCenterY;
    let targetX = 0;
    let targetY = centerY;
    let targetZ = 0;
    let yawDeg = specimen.defaultYawDeg;
    let dist = specimen.defaultDist;
    let elev = 0.65;

    if (activeSectionId) {
      const callout = specimen.callouts[activeSectionId];
      const bone = callout.boneName ? bonesByName.get(callout.boneName) : undefined;
      if (bone) {
        clonedScene.updateMatrixWorld(true);
        const wp = new THREE.Vector3();
        bone.getWorldPosition(wp);
        targetX = wp.x * 0.55;
        targetY = THREE.MathUtils.lerp(centerY, wp.y, 0.6);
        targetZ = wp.z * 0.55;
      } else {
        targetX = callout.offset[0] * 0.4;
        targetY = centerY + callout.offset[1] * 0.4;
        targetZ = callout.offset[2] * 0.4;
      }

      yawDeg = callout.focusYawDeg;
      dist = callout.focusDist;
      elev = callout.focusPitchY;
    }

    if (anglePreset === 'posterior') {
      yawDeg = yawDeg + 150;
    } else if (anglePreset === 'lateral') {
      yawDeg = 90;
    }

    const rad = (yawDeg * Math.PI) / 180;
    goalTargetRef.current.set(targetX, targetY, targetZ);
    goalPosRef.current.set(
      targetX + Math.sin(rad) * dist,
      targetY + elev,
      targetZ + Math.cos(rad) * dist,
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
    bonesByName,
    camera,
    clonedScene,
    modelCenterY,
    reducedMotion,
    resetTrigger,
    specimen,
  ]);

  const activeCallout = activeSectionId ? specimen.callouts[activeSectionId] : null;
  const activeParts = activeCallout?.parts ?? [];
  const tempWorldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    if (rigRef.current && entranceRef.current < 1) {
      entranceRef.current = THREE.MathUtils.damp(entranceRef.current, 1, 5.4, delta);
      if (1 - entranceRef.current < 0.001) entranceRef.current = 1;
      const p = entranceRef.current;
      rigRef.current.scale.setScalar(0.94 + p * 0.06);
      rigRef.current.rotation.y = (1 - p) * -0.18;
    }

    if (floatRef.current) {
      if (specimen.hoverHeight > 0 && isPlaying && !reducedMotion) {
        const t = state.clock.elapsedTime;
        floatRef.current.position.y = Math.sin(t * 1.4) * 0.09;
      } else {
        floatRef.current.position.y = THREE.MathUtils.damp(
          floatRef.current.position.y,
          0,
          5,
          delta,
        );
      }
    }

    const baseY = modelCenterY;
    const floatY = floatRef.current?.position.y ?? 0;

    if (!activeSectionId) {
      // Overview mode: track the 4 broad CVA section zones
      for (const sec of SECTIONS) {
        const grp = zonePinRefs.current[sec.id];
        if (!grp) continue;
        const callout = specimen.callouts[sec.id];
        const bone = callout.boneName ? bonesByName.get(callout.boneName) : undefined;
        if (bone) {
          bone.getWorldPosition(tempWorldPos);
          grp.position.set(
            tempWorldPos.x + callout.offset[0],
            tempWorldPos.y + callout.offset[1],
            tempWorldPos.z + callout.offset[2],
          );
        } else {
          grp.position.set(
            callout.offset[0],
            baseY + callout.offset[1] + floatY,
            callout.offset[2],
          );
        }
      }
    } else {
      // Focused section mode: track EVERY precise animal-specific anatomical sub-part live on its bone!
      for (const part of activeParts) {
        const grp = subPartRefs.current[part.id];
        if (!grp) continue;
        const bone = part.boneName ? bonesByName.get(part.boneName) : undefined;
        if (bone) {
          bone.getWorldPosition(tempWorldPos);
          grp.position.set(
            tempWorldPos.x + part.offset[0],
            tempWorldPos.y + part.offset[1],
            tempWorldPos.z + part.offset[2],
          );
        } else {
          grp.position.set(
            part.offset[0],
            baseY + part.offset[1] + floatY,
            part.offset[2],
          );
        }
      }
    }

    const controls = controlsRef.current;
    if (isTransitioningRef.current && controls) {
      const speed = 5.2;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, goalPosRef.current.x, speed, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, goalPosRef.current.y, speed, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, goalPosRef.current.z, speed, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, goalTargetRef.current.x, speed, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, goalTargetRef.current.y, speed, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, goalTargetRef.current.z, speed, delta);
      controls.update();

      if (
        camera.position.distanceTo(goalPosRef.current) < 0.01 &&
        controls.target.distanceTo(goalTargetRef.current) < 0.01
      ) {
        camera.position.copy(goalPosRef.current);
        controls.target.copy(goalTargetRef.current);
        controls.update();
        isTransitioningRef.current = false;
      }
    }
  });

  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeAccent = activeSection ? activeSection.accent : '#ffd9d0';

  return (
    <>
      <ambientLight intensity={0.78} color="#fff2ee" />
      <hemisphereLight args={['#fff9f2', '#4c161a', 1.45]} />
      <directionalLight position={[-5, 7, 6]} intensity={2.4} color="#fff5e8" />
      <directionalLight position={[5.5, 3, -5]} intensity={1.7} color="#dbeaff" />
      <directionalLight position={[-3, -2, 3]} intensity={0.65} color="#ffd8d0" />
      <pointLight
        position={[0, 2.2, -3.6]}
        intensity={activeSectionId ? 1.9 : 0.8}
        distance={12}
        color={activeAccent}
      />

      {/* Normalized Animated Vertebrate Assembly */}
      <group ref={rigRef}>
        <group ref={floatRef}>
          <primitive
            object={clonedScene}
            position={normOffset}
            scale={normScale}
          />
        </group>

        {/* Grounded Studio Anatomical Plinth */}
        <group position={[0, PLINTH_Y - 0.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.35, 64]} />
            <meshBasicMaterial
              color="#140202"
              transparent
              opacity={0.56}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <ringGeometry args={[2.28, 2.34, 64]} />
            <meshBasicMaterial
              color={activeAccent}
              transparent
              opacity={0.38}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[2.75, 2.78, 64]} />
            <meshBasicMaterial
              color="#ffd9d0"
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>

      {/* OVERVIEW MODE: 4 Clean Zone Pins (Click any part to reveal precise animal anatomy labels!) */}
      {showLabels &&
        !activeSectionId &&
        SECTIONS.map((sec) => {
          const callout = specimen.callouts[sec.id];
          return (
            <group
              key={sec.id}
              ref={(el) => {
                zonePinRefs.current[sec.id] = el;
              }}
            >
              <mesh>
                <sphereGeometry args={[0.055, 16, 16]} />
                <meshBasicMaterial color={sec.accent} transparent opacity={0.95} />
              </mesh>
              <Html center zIndexRange={[15, 0]} style={{ pointerEvents: 'auto' }}>
                <button
                  type="button"
                  data-testid={`animal-pin-${sec.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSection(sec.id);
                  }}
                  title={`${sec.n}. ${sec.name}: ${callout.title}`}
                  className="group flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#ffd9d0]/30 bg-[#200506]/82 py-0.5 pl-1 pr-2.5 text-[11px] font-semibold text-[#fff1ee] shadow-lg backdrop-blur-md transition-transform hover:scale-105"
                >
                  <span
                    className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: sec.accent, color: sec.badgeText }}
                  >
                    {sec.n}
                  </span>
                  <span className="font-display tracking-wide">{sec.name}</span>
                </button>
              </Html>
            </group>
          );
        })}

      {/* FOCUSED SECTION MODE: Precise Animal-Specific Leader-Line Anatomical Labels! */}
      {showLabels &&
        activeSection &&
        activeParts.map((part) => {
          const isSelected = selectedSubPartId === part.id;
          const [dx, dy] = part.calloutShift;
          const alignLeft = dx < 0;

          return (
            <group
              key={part.id}
              ref={(el) => {
                subPartRefs.current[part.id] = el;
              }}
            >
              {/* Crisp 3D anatomical pinpoint sphere right on the exact bone/structure */}
              <mesh>
                <sphereGeometry args={[isSelected ? 0.068 : 0.048, 16, 16]} />
                <meshBasicMaterial
                  color={isSelected ? '#fff1ee' : activeSection.accent}
                  transparent
                  opacity={0.96}
                />
              </mesh>

              {/* Delicate SVG leader stem + crisp textbook anatomical label pill */}
              <Html
                center
                zIndexRange={[isSelected ? 22 : 16, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div className="relative h-0 w-0 select-none">
                  {/* Pinpoint anchor halo at exact (0,0) */}
                  <span
                    className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border"
                    style={{
                      backgroundColor: isSelected
                        ? '#fff1ee'
                        : activeSection.accent,
                      borderColor: '#fff1ee',
                      boxShadow: `0 0 10px ${activeSection.accent}`,
                    }}
                  />

                  {/* Crisp leader line from exact anatomical pinpoint to floating label */}
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
                      stroke={isSelected ? '#fff1ee' : activeSection.accent}
                      strokeOpacity={isSelected ? 0.95 : 0.78}
                      strokeWidth={isSelected ? 1.8 : 1.3}
                    />
                  </svg>

                  {/* Clickable Precise Anatomical Label Pill */}
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
                      transform: alignLeft
                        ? 'translate(-100%, -50%)'
                        : 'translate(0%, -50%)',
                      backgroundColor: isSelected
                        ? 'rgba(46, 8, 10, 0.96)'
                        : 'rgba(26, 4, 5, 0.88)',
                      borderColor: isSelected
                        ? '#fff1ee'
                        : `${activeSection.accent}cc`,
                      boxShadow: isSelected
                        ? `0 0 18px ${activeSection.accent}88`
                        : '0 6px 16px rgba(0,0,0,0.45)',
                    }}
                    className="pointer-events-auto absolute flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 pl-1 pr-2.5 text-[11px] font-semibold text-[#fff1ee] backdrop-blur-md transition-transform hover:scale-[1.04]"
                  >
                    <span
                      className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{
                        backgroundColor: isSelected
                          ? '#fff1ee'
                          : activeSection.accent,
                        color: isSelected
                          ? '#3b0a0a'
                          : activeSection.badgeText,
                      }}
                    >
                      {part.tag}
                    </span>
                    <span className="font-display tracking-wide">
                      {part.label}
                    </span>
                  </button>
                </div>
              </Html>
            </group>
          );
        })}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.8}
        zoomSpeed={0.9}
        panSpeed={0.75}
        minDistance={2.2}
        maxDistance={14.5}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI - 0.22}
        autoRotate={autoOrbit && !reducedMotion}
        autoRotateSpeed={0.9}
        onStart={() => {
          isTransitioningRef.current = false;
          onUserOrbitStart?.();
        }}
      />
    </>
  );
}
