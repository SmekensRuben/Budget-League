import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function NpcRenderer({
  modelUrl,
  equipment = {},
  height = 260,
  interactive = true,
  className = "",
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const modelRef = useRef(null);
  const equipmentRef = useRef([]);
  const equipmentEntries = useMemo(
    () =>
      Object.entries(equipment).filter(
        ([, data]) => Boolean(data && typeof data === "object" && data.url)
      ),
    [equipment]
  );

  useEffect(() => {
    if (!containerRef.current || !modelUrl) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setClearAlpha(0);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.background = "transparent";
    renderer.domElement.style.border = "none";
    renderer.domElement.style.outline = "none";
    renderer.domElement.style.boxShadow = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = interactive ? "auto" : "none";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 7.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, 6, -10);
    scene.add(rimLight);

    const fitCameraToSize = (size) => {
      const maxAxis = Math.max(size.x, size.y, size.z);
      const fitHeightDistance = maxAxis / (2 * Math.tan((camera.fov * Math.PI) / 360));
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.2;

      camera.position.set(distance, 0, distance);
      camera.lookAt(0, 0, 0);

      controls.target.set(0, 0, 0);
      controls.update();
    };

    const applyMeshSettings = (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    };

    const centerObject = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.updateMatrixWorld(true);
    };

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        applyMeshSettings(model);
        scene.add(model);
        modelRef.current = model;

        const applySlotBehavior = (slotName, behavior, shrinkPercent) => {
          if (!behavior || behavior === "none") return;
          const target = model.getObjectByName(slotName);
          if (!target) {
            console.warn(`${slotName} niet gevonden in NPC-model; gedrag niet toegepast.`);
            return;
          }

          target.traverse((child) => {
            if (!child.isMesh) return;

            if (behavior === "remove") {
              if (Array.isArray(child.material)) {
                child.material = child.material.map((material) => {
                  const cloned = material.clone();
                  cloned.transparent = true;
                  cloned.opacity = 0;
                  cloned.depthWrite = false;
                  return cloned;
                });
              } else if (child.material) {
                const cloned = child.material.clone();
                cloned.transparent = true;
                cloned.opacity = 0;
                cloned.depthWrite = false;
                child.material = cloned;
              }
            }

            if (behavior === "shrink" && child.geometry) {
              const scalePercent = Number(shrinkPercent ?? 70);
              const scaleValue =
                Number.isFinite(scalePercent) && scalePercent > 0
                  ? Math.min(scalePercent, 100) / 100
                  : 0.7;
              child.geometry = child.geometry.clone();
              child.geometry.scale(scaleValue, scaleValue, scaleValue);
              child.geometry.computeBoundingBox();
              child.geometry.computeBoundingSphere();
            }
          });
        };

        const centerAndFit = () => {
          model.position.set(0, 0, 0);
          model.updateMatrixWorld(true);
          centerObject(model);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          fitCameraToSize(size);
        };

        const applyVerticalOffset = (equipModel, offsetPercent) => {
          if (!offsetPercent) return;
          const offsetValue = Number(offsetPercent);
          if (!Number.isFinite(offsetValue) || offsetValue === 0) return;
          const box = new THREE.Box3().setFromObject(equipModel);
          const size = box.getSize(new THREE.Vector3());
          const offset = (offsetValue / 100) * size.y;
          equipModel.position.y += offset;
          equipModel.updateMatrixWorld(true);
        };

        const attachEquipment = (slotData, slotName) => {
          const { url, onEquipBehavior, verticalOffsetPercent, shrinkPercent } = slotData;
          if (!url) return;

          applySlotBehavior(slotName, onEquipBehavior, shrinkPercent);

          loader.load(
            url,
            (equipGltf) => {
              const equipModel = equipGltf.scene;
              applyMeshSettings(equipModel);
              centerObject(equipModel);

              const slot = model.getObjectByName(slotName);
              if (!slot) {
                console.warn(
                  `${slotName} niet gevonden in NPC-model; item wordt als los object toegevoegd.`
                );
                model.add(equipModel);
              } else {
                equipModel.position.set(0, 0, 0);
                equipModel.rotation.set(0, 0, 0);
                equipModel.scale.set(1, 1, 1);
                equipModel.updateMatrixWorld(true);
                slot.add(equipModel);
              }
              applyVerticalOffset(equipModel, verticalOffsetPercent);
              equipmentRef.current = [...equipmentRef.current, equipModel];
              centerAndFit();
            },
            undefined,
            (equipError) => {
              console.error(`Kon item voor ${slotName} niet laden:`, equipError);
            }
          );
        };

        equipmentEntries.forEach(([slotName, slotData]) => {
          attachEquipment(slotData, slotName);
        });

        centerAndFit();
      },
      undefined,
      (error) => {
        console.error("Kon model niet laden:", error);
      }
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    const animate = () => {
      controls.update();
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener("resize", handleResize);

    rendererRef.current = renderer;
    sceneRef.current = scene;

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      modelRef.current = null;
      equipmentRef.current = [];
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [modelUrl, equipmentEntries, height, interactive]);

  return <div ref={containerRef} className={`w-full ${className}`} style={{ height }} />;
}
