import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, Camera, Eye, Play, Pause, Layers, Zap } from 'lucide-react';

export type ProductTypeId =
  | 'fish_outdoor'
  | 'fish_indoor'
  | 'sport_court'
  | 'roof_canopy'
  | 'roof_flush'
  | 'ground_mount';

export interface PanelItem2D {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isActive: boolean;
  isCutout: boolean;
}

export interface SolarSite3DProps {
  productType: ProductTypeId;
  siteWidth: number;
  siteLength: number;
  edgeClearance: number;
  siteShape: string;
  cutoutWidth: number;
  cutoutLength: number;
  dripHeight: number;
  tiltAngle: number;
  slopeType: 'single' | 'gable';
  buildingHeight: number;
  groundMountStyle: 'rows' | 'canopy';
  panelsData: PanelItem2D[];
  totalPanels: number;
  totalCapacityKW: number;
}

/**
 * Helper: Build a 3D beam/cylinder/box connecting point p1 to p2
 */
function createMemberBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  height: number,
  material: THREE.Material,
  isCylinder = false
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geo = isCylinder
    ? new THREE.CylinderGeometry(width / 2, width / 2, len, 10)
    : new THREE.BoxGeometry(width, height, len);

  const mesh = new THREE.Mesh(geo, material);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(mid);

  if (isCylinder) {
    const up = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
  } else {
    mesh.lookAt(p2);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Helper: Build realistic H-Beam (I-Beam) with top flange, bottom flange, and web between p1 and p2
 */
function createHBeamBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  H: number,
  B: number,
  tw: number,
  tf: number,
  material: THREE.Material
): THREE.Group {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const grp = new THREE.Group();
  if (len < 0.01) return grp;

  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  grp.position.copy(mid);
  grp.lookAt(p2);

  // Web (腹板)
  const webGeo = new THREE.BoxGeometry(tw, H - 2 * tf, len);
  const webMesh = new THREE.Mesh(webGeo, material);
  webMesh.castShadow = true;

  // Top flange (上翼板)
  const flGeo = new THREE.BoxGeometry(B, tf, len);
  const topFl = new THREE.Mesh(flGeo, material);
  topFl.position.y = (H - tf) / 2;
  topFl.castShadow = true;

  // Bottom flange (下翼板)
  const botFl = new THREE.Mesh(flGeo, material);
  botFl.position.y = -(H - tf) / 2;
  botFl.castShadow = true;

  grp.add(webMesh, topFl, botFl);
  return grp;
}

export default function SolarSite3DView({
  productType,
  siteWidth,
  siteLength,
  siteShape,
  cutoutWidth,
  cutoutLength,
  dripHeight,
  tiltAngle,
  slopeType,
  buildingHeight,
  groundMountStyle,
  panelsData,
  totalPanels,
  totalCapacityKW,
}: SolarSite3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);

  const [autoRotate, setAutoRotate] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const [showMepAndRoof, setShowMepAndRoof] = useState(true);
  const [showEnvironment, setShowEnvironment] = useState(true);

  const W = Math.max(2, Number(siteWidth) || 20);
  const L = Math.max(2, Number(siteLength) || 15);
  const tiltRad = (Math.max(0, Math.min(45, Number(tiltAngle) || 6)) * Math.PI) / 180;
  const clearH = Math.max(0.2, Number(dripHeight) || 3);
  const bldgH = Math.max(3, Number(buildingHeight) || 7);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf2f8);
    scene.fog = new THREE.FogExp2(0xeaf2f8, 0.0022);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);
    const maxDim = Math.max(W, L);
    camera.position.set(maxDim * 1.05, maxDim * 0.75, maxDim * 1.15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 3;
    controls.maxDistance = 800;
    controls.target.set(0, 3.2, 0);
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.5);
    hemiLight.position.set(0, 80, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    dirLight.position.set(60, 95, 55);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 350;
    const d = 85;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const contentGroup = new THREE.Group();
    scene.add(contentGroup);
    contentGroupRef.current = contentGroup;

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update autoRotate on controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.4;
    }
  }, [autoRotate]);

  // Rebuild 3D geometry whenever parameters or layout change
  useEffect(() => {
    const group = contentGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0] as any;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const cw = Math.min(cutoutWidth, W);
    const cl = Math.min(cutoutLength, L);

    const isInsideFootprint = (px: number, py: number) => {
      if (siteShape === 'l-shape') {
        if (px > W - cw && py < cl) return false;
      } else if (siteShape === 'u-shape') {
        const cx1 = (W - cw) / 2;
        const cx2 = cx1 + cw;
        if (px > cx1 && px < cx2 && py < cl) return false;
      }
      return true;
    };

    const createFootprintShape = (inset = 0) => {
      const s = new THREE.Shape();
      const w0 = inset;
      const w1 = W - inset;
      const l0 = inset;
      const l1 = L - inset;
      if (siteShape === 'l-shape' && cw > 0 && cl > 0) {
        s.moveTo(w0 - W / 2, -(l0 - L / 2));
        s.lineTo(W - cw - inset - W / 2, -(l0 - L / 2));
        s.lineTo(W - cw - inset - W / 2, -(cl + inset - L / 2));
        s.lineTo(w1 - W / 2, -(cl + inset - L / 2));
        s.lineTo(w1 - W / 2, -(l1 - L / 2));
        s.lineTo(w0 - W / 2, -(l1 - L / 2));
        s.closePath();
      } else if (siteShape === 'u-shape' && cw > 0 && cl > 0) {
        const cx1 = (W - cw) / 2;
        const cx2 = cx1 + cw;
        s.moveTo(w0 - W / 2, -(l0 - L / 2));
        s.lineTo(cx1 - inset - W / 2, -(l0 - L / 2));
        s.lineTo(cx1 - inset - W / 2, -(cl + inset - L / 2));
        s.lineTo(cx2 + inset - W / 2, -(cl + inset - L / 2));
        s.lineTo(cx2 + inset - W / 2, -(l0 - L / 2));
        s.lineTo(w1 - W / 2, -(l0 - L / 2));
        s.lineTo(w1 - W / 2, -(l1 - L / 2));
        s.lineTo(w0 - W / 2, -(l1 - L / 2));
        s.closePath();
      } else {
        s.moveTo(w0 - W / 2, -(l0 - L / 2));
        s.lineTo(w1 - W / 2, -(l0 - L / 2));
        s.lineTo(w1 - W / 2, -(l1 - L / 2));
        s.lineTo(w0 - W / 2, -(l1 - L / 2));
        s.closePath();
      }
      return s;
    };

    const buildExtrudedSlab = (height: number, yBottom: number, color: number, inset = 0, opacity = 1) => {
      const shape = createFootprintShape(inset);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1,
        transparent: opacity < 1,
        opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yBottom;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      return mesh;
    };

    // Base surrounding ground plane
    const pad = Math.max(W, L) * 0.8 + 12;
    const worldGroundGeo = new THREE.PlaneGeometry(W + pad * 2, L + pad * 2);
    worldGroundGeo.rotateX(-Math.PI / 2);
    const worldGroundMat = new THREE.MeshStandardMaterial({
      color: productType === 'ground_mount' || productType === 'sport_court' || productType === 'fish_outdoor' ? 0x86efac : 0xcbd5e1,
      roughness: 0.95,
    });
    const worldGround = new THREE.Mesh(worldGroundGeo, worldGroundMat);
    worldGround.position.y = -0.05;
    worldGround.receiveShadow = true;
    group.add(worldGround);

    const gridHelper = new THREE.GridHelper(Math.max(W, L) + pad, 30, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.y = -0.03;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    (gridHelper.material as THREE.Material).transparent = true;
    group.add(gridHelper);

    const isRoofProduct = productType === 'roof_canopy' || productType === 'roof_flush';
    const baseElevation = isRoofProduct ? bldgH : 0;

    const effectiveSlope: 'single' | 'gable' =
      productType === 'fish_indoor'
        ? 'gable'
        : productType === 'fish_outdoor' || productType === 'roof_canopy'
        ? 'single'
        : slopeType;

    // Height of canopy/roof surface at a given 2D y coordinate (0..L)
    const getCanopySurfaceY = (y2d: number) => {
      if (productType === 'ground_mount' && groundMountStyle === 'rows') {
        return baseElevation + clearH;
      }
      const eaveY = baseElevation + (productType === 'roof_flush' ? 0.25 : clearH);
      if (effectiveSlope === 'gable') {
        const distFromEdge = Math.min(y2d, L - y2d);
        return eaveY + distFromEdge * Math.tan(tiltRad);
      } else {
        return eaveY + (L - y2d) * Math.tan(tiltRad);
      }
    };

    const getCanopyTiltSigned = (y2d: number) => {
      if (productType === 'ground_mount' && groundMountStyle === 'rows') {
        return tiltRad;
      }
      if (effectiveSlope === 'gable') {
        return y2d >= L / 2 ? tiltRad : -tiltRad;
      }
      return tiltRad;
    };

    // =========================================================================
    // 1. ENVIRONMENT & BASE FACILITY PER PRODUCT TYPE
    // =========================================================================
    if (showEnvironment) {
      if (productType === 'fish_outdoor') {
        // ① 魚電共生室外型：戶外養殖池 + 池岸土堤 + 水車增氧機 + 走道棧橋
        const bankOuter = buildExtrudedSlab(0.7, 0, 0x94a3b8, -0.8);
        group.add(bankOuter);

        const waterSlab = buildExtrudedSlab(0.55, 0.02, 0x0284c7, 0.3, 0.84);
        group.add(waterSlab);

        const aeratorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const floatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
        const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });

        const stepX = Math.max(6, W / 3);
        const stepZ = Math.max(6, L / 3);
        for (let ax = stepX * 0.6; ax < W - 2; ax += stepX) {
          for (let ay = stepZ * 0.6; ay < L - 2; ay += stepZ) {
            if (!isInsideFootprint(ax, ay)) continue;
            const ag = new THREE.Group();
            ag.position.set(ax - W / 2, 0.6, ay - L / 2);

            const f1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.2), floatMat);
            f1.position.set(0, 0, -0.45);
            const f2 = f1.clone();
            f2.position.set(0, 0, 0.45);
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 12), aeratorMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(0, 0.15, 0);
            const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 0.08, 16), foamMat);
            foam.position.set(0.9, -0.02, 0);

            ag.add(f1, f2, wheel, foam);
            group.add(ag);
          }
        }
      } else if (productType === 'fish_indoor') {
        // ② 魚電共生室內型：室內溫室/養殖棚 + 半透明圍牆 + 捲門 + 室內圓形養殖桶與中央步道
        const floorSlab = buildExtrudedSlab(0.3, 0, 0xcbd5e1, 0);
        group.add(floorSlab);

        const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
        const tankWaterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
        const tankRadius = Math.min(1.6, Math.max(0.8, Math.min(W, L) * 0.08));
        const spacing = tankRadius * 2.8;

        for (let tx = spacing; tx < W - spacing * 0.7; tx += spacing) {
          for (let ty = spacing; ty < L - spacing * 0.7; ty += spacing) {
            if (!isInsideFootprint(tx, ty)) continue;
            const tg = new THREE.Group();
            tg.position.set(tx - W / 2, 0.3, ty - L / 2);
            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius, tankRadius, 1.1, 24), tankMat);
            cyl.position.y = 0.55;
            cyl.castShadow = true;
            const topW = new THREE.Mesh(new THREE.CylinderGeometry(tankRadius * 0.94, tankRadius * 0.94, 0.05, 24), tankWaterMat);
            topW.position.y = 1.09;
            tg.add(cyl, topW);
            group.add(tg);
          }
        }

        const wallMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          transparent: true,
          opacity: 0.42,
          roughness: 0.2,
          side: THREE.DoubleSide,
        });
        const wallH = clearH;
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, wallH), wallMat);
        frontWall.position.set(0, wallH / 2, L / 2);
        const backWall = frontWall.clone();
        backWall.position.set(0, wallH / 2, -L / 2);
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(L, wallH), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-W / 2, wallH / 2, 0);
        const rightWall = leftWall.clone();
        rightWall.position.set(W / 2, wallH / 2, 0);
        group.add(frontWall, backWall, leftWall, rightWall);

        const ridgeH = getCanopySurfaceY(L / 2) - wallH;
        if (ridgeH > 0.05) {
          const triShape = new THREE.Shape();
          triShape.moveTo(-L / 2, 0);
          triShape.lineTo(0, ridgeH);
          triShape.lineTo(L / 2, 0);
          triShape.closePath();
          const triGeo = new THREE.ShapeGeometry(triShape);
          const leftGable = new THREE.Mesh(triGeo, wallMat);
          leftGable.rotation.y = Math.PI / 2;
          leftGable.position.set(-W / 2, wallH, 0);
          const rightGable = new THREE.Mesh(triGeo, wallMat);
          rightGable.rotation.y = Math.PI / 2;
          rightGable.position.set(W / 2, wallH, 0);
          group.add(leftGable, rightGable);
        }

        const doorW = Math.min(3.5, W * 0.25);
        const doorH = Math.min(3.2, wallH * 0.85);
        const doorMesh = new THREE.Mesh(
          new THREE.BoxGeometry(doorW, doorH, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.4 })
        );
        doorMesh.position.set(W / 2 - doorW * 0.8, doorH / 2, L / 2 + 0.02);
        group.add(doorMesh);
      } else if (productType === 'sport_court') {
        // =====================================================================
        // ③ 風雨球場：嚴格依據上傳之《風雨球場設計模板》(澎湖嵵裡國小 156.75kWp) 建模
        // 包含：外圍球場地坪、縱向 800×700 連續基礎地梁、標準籃球場線 (中圈/禁區/三分線/邊線)、2座籃球架
        // =====================================================================
        const outerApron = buildExtrudedSlab(0.15, 0, 0x15803d, -1.6);
        group.add(outerApron);
        const mainCourt = buildExtrudedSlab(0.18, 0.01, 0x1d4ed8, -0.3);
        group.add(mainCourt);

        // 標準籃球場尺寸比例 (沿長軸排佈球場)
        const alongX = W >= L;
        const cwCourt = alongX ? Math.max(6, W * 0.82) : Math.max(4, W * 0.72);
        const clCourt = alongX ? Math.max(4, L * 0.72) : Math.max(6, L * 0.82);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 });
        const courtSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });

        // 球場主藍底與白色邊線框
        const courtBorder = new THREE.Mesh(new THREE.PlaneGeometry(cwCourt + 0.16, clCourt + 0.16), lineMat);
        courtBorder.rotation.x = -Math.PI / 2;
        courtBorder.position.set(0, 0.194, 0);
        const courtInner = new THREE.Mesh(new THREE.PlaneGeometry(cwCourt, clCourt), courtSurfaceMat);
        courtInner.rotation.x = -Math.PI / 2;
        courtInner.position.set(0, 0.196, 0);
        group.add(courtBorder, courtInner);

        // 中場白線與中圈
        const midLine = new THREE.Mesh(
          new THREE.PlaneGeometry(alongX ? 0.08 : cwCourt, alongX ? clCourt : 0.08),
          lineMat
        );
        midLine.rotation.x = -Math.PI / 2;
        midLine.position.set(0, 0.202, 0);
        const cRad = Math.min(cwCourt, clCourt) * 0.115;
        const centerCircle = new THREE.Mesh(new THREE.RingGeometry(cRad, cRad + 0.08, 36), lineMat);
        centerCircle.rotation.x = -Math.PI / 2;
        centerCircle.position.set(0, 0.203, 0);
        const centerFill = new THREE.Mesh(new THREE.CircleGeometry(cRad, 36), redMat);
        centerFill.rotation.x = -Math.PI / 2;
        centerFill.position.set(0, 0.201, 0);
        group.add(midLine, centerCircle, centerFill);

        // 兩端紅色禁區、罰球圈與三分球弧線
        const keyLen = (alongX ? cwCourt : clCourt) * 0.21;
        const keyWid = (alongX ? clCourt : cwCourt) * 0.33;
        const threePtRad = Math.min(cwCourt, clCourt) * 0.38;

        for (const side of [-1, 1]) {
          // 禁區白框 + 紅底
          const kx = alongX ? side * (cwCourt / 2 - keyLen / 2) : 0;
          const kz = alongX ? 0 : side * (clCourt / 2 - keyLen / 2);
          const keyBorder = new THREE.Mesh(
            new THREE.PlaneGeometry(
              (alongX ? keyLen : keyWid) + 0.12,
              (alongX ? keyWid : keyLen) + 0.12
            ),
            lineMat
          );
          keyBorder.rotation.x = -Math.PI / 2;
          keyBorder.position.set(kx, 0.201, kz);

          const keyFill = new THREE.Mesh(
            new THREE.PlaneGeometry(alongX ? keyLen : keyWid, alongX ? keyWid : keyLen),
            redMat
          );
          keyFill.rotation.x = -Math.PI / 2;
          keyFill.position.set(kx, 0.203, kz);

          // 罰球半圓
          const ftX = alongX ? side * (cwCourt / 2 - keyLen) : 0;
          const ftZ = alongX ? 0 : side * (clCourt / 2 - keyLen);
          const ftRing = new THREE.Mesh(new THREE.RingGeometry(keyWid * 0.35, keyWid * 0.35 + 0.07, 28), lineMat);
          ftRing.rotation.x = -Math.PI / 2;
          ftRing.position.set(ftX, 0.204, ftZ);

          // 三分線半圓弧
          const tpX = alongX ? side * (cwCourt / 2 - 1.2) : 0;
          const tpZ = alongX ? 0 : side * (clCourt / 2 - 1.2);
          const startAng = alongX
            ? side === -1
              ? -Math.PI / 2
              : Math.PI / 2
            : side === -1
            ? 0
            : Math.PI;
          const tpArc = new THREE.Mesh(
            new THREE.RingGeometry(threePtRad, threePtRad + 0.07, 36, 1, startAng, Math.PI),
            lineMat
          );
          tpArc.rotation.x = -Math.PI / 2;
          tpArc.position.set(tpX, 0.203, tpZ);

          group.add(keyBorder, keyFill, ftRing, tpArc);
        }

        // 兩端標準籃球架
        const buildHoop = (x: number, z: number, rotY: number) => {
          const hg = new THREE.Group();
          hg.position.set(x, 0.2, z);
          hg.rotation.y = rotY;
          const postMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.45, roughness: 0.3 });
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.25, 0.24), postMat);
          post.position.set(0, 1.62, 0);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.2), postMat);
          arm.position.set(0, 3.05, 0.55);
          const boardFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.84, 1.08, 0.04),
            new THREE.MeshStandardMaterial({ color: 0x1e293b })
          );
          boardFrame.position.set(0, 3.05, 1.13);
          const board = new THREE.Mesh(
            new THREE.BoxGeometry(1.76, 1.0, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
          );
          board.position.set(0, 3.05, 1.15);
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.23, 0.025, 10, 24),
            new THREE.MeshStandardMaterial({ color: 0xea580c })
          );
          rim.rotation.x = Math.PI / 2;
          rim.position.set(0, 2.82, 1.42);
          hg.add(post, arm, boardFrame, board, rim);
          return hg;
        };
        if (alongX) {
          group.add(buildHoop(-cwCourt / 2 - 0.3, 0, Math.PI / 2));
          group.add(buildHoop(cwCourt / 2 + 0.3, 0, -Math.PI / 2));
        } else {
          group.add(buildHoop(0, -clCourt / 2 - 0.3, 0));
          group.add(buildHoop(0, clCourt / 2 + 0.3, Math.PI));
        }
      } else if (productType === 'roof_canopy') {
        const buildingMesh = buildExtrudedSlab(bldgH, 0, 0xd6d3d1, 0);
        group.add(buildingMesh);
        const roofTopMesh = buildExtrudedSlab(0.08, bldgH, 0x94a3b8, 0.25);
        group.add(roofTopMesh);
        const parapetOuter = buildExtrudedSlab(0.9, bldgH, 0xe7e5e4, 0);
        group.add(parapetOuter);
      } else if (productType === 'roof_flush') {
        const wallH = bldgH;
        const factoryBase = buildExtrudedSlab(wallH, 0, 0xcbd5e1, 0);
        group.add(factoryBase);

        const roofSamplesZ = 20;
        const roofStripLen = L / roofSamplesZ;
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.35 });
        for (let i = 0; i < roofSamplesZ; i++) {
          const yCenter = (i + 0.5) * roofStripLen;
          const surfY = getCanopySurfaceY(yCenter) - 0.18;
          const tilt = getCanopyTiltSigned(yCenter);
          const stripGeo = new THREE.BoxGeometry(W + 0.4, 0.12, roofStripLen / Math.cos(Math.abs(tilt)) + 0.04);
          const stripMesh = new THREE.Mesh(stripGeo, deckMat);
          stripMesh.position.set(0, surfY, yCenter - L / 2);
          stripMesh.rotation.x = tilt;
          stripMesh.receiveShadow = true;
          stripMesh.castShadow = true;
          group.add(stripMesh);
        }
      } else if (productType === 'ground_mount') {
        const gravelPad = buildExtrudedSlab(0.12, 0, 0x9ca3af, -0.3);
        group.add(gravelPad);
      }
    }

    // =========================================================================
    // 2. STEEL STRUCTURE & BIM DETAILS (依據《風雨球場設計模板》Tekla & FreeCAD 完整繪製)
    // =========================================================================
    if (showStructure) {
      if (productType === 'sport_court') {
        // =====================================================================
        // ★ 風雨球場專屬 Tekla 構件級 BIM 3D 模型 (22m 雙柱無中柱大跨距！)
        // =====================================================================
        const steelPrimaryMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.62,
          roughness: 0.32,
        });
        const steelSecondaryMat = new THREE.MeshStandardMaterial({
          color: 0x475569,
          metalness: 0.55,
          roughness: 0.38,
        });
        const purlinMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.5,
          roughness: 0.4,
        });
        const fdnMat = new THREE.MeshStandardMaterial({
          color: 0x9ca3af,
          roughness: 0.85,
        });
        const basePlateMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.3,
        });
        const safetyPadMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15, // 鮮黃色鋼柱防撞護墊 (14座，高 2.0m)
          roughness: 0.5,
        });
        const braceRodMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.7,
          roughness: 0.25,
        });

        // 柱網設定：沿 X 向 (長邊 31.5m) 設 7 榀框架 (14 支柱)，兩側屋面各懸挑 overhangX
        // 沿 Z 向 (跨距 22m) 僅在兩端落柱 (zFront, zBack)，中央屋脊 (z=0) 絕不落中柱！
        const numFrames = 7; // 軸 A ~ G 共 7 榀 (6 跨)
        const overhangX = Math.min(2.0, W * 0.06);
        const overhangZ = Math.min(1.0, L * 0.045);
        const colStartX = overhangX;
        const colEndX = W - overhangX;
        const colSpanX = (colEndX - colStartX) / (numFrames - 1);

        const y2dBack = overhangZ; // 軸 1 (北/西側柱列)
        const y2dFront = L - overhangZ; // 軸 5 (南/東側柱列)
        const zBack = y2dBack - L / 2;
        const zFront = y2dFront - L / 2;

        // 1.1 縱向連續基礎地梁 (800×700mm, 沿兩側柱列貫通)
        for (const zCol of [zBack, zFront]) {
          const gradeBeam = new THREE.Mesh(
            new THREE.BoxGeometry(colEndX - colStartX + 1.6, 0.32, 0.8),
            fdnMat
          );
          gradeBeam.position.set(0, 0.14, zCol);
          gradeBeam.receiveShadow = true;
          group.add(gradeBeam);
        }

        const frameX3DList: number[] = [];

        // 1.2 建立 7 榀門型剛架：14 支 RH300×300 主鋼柱 (SC1~SC7) + 柱墩 + D1/D2 柱底板錨栓 + 14座防撞護墊 + SG1~SG6 RH400×200 大梁 + H10 斜隅加腋
        for (let ix = 0; ix < numFrames; ix++) {
          const x2d = colStartX + ix * colSpanX;
          const x3d = x2d - W / 2;
          frameX3DList.push(x3d);

          for (const y2dCol of [y2dBack, y2dFront]) {
            const zCol = y2dCol - L / 2;
            const eaveTopY = getCanopySurfaceY(y2dCol) - 0.22;

            // 混凝土柱墩 (600×600)
            const ped = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.62), fdnMat);
            ped.position.set(x3d, 0.19, zCol);
            group.add(ped);

            // 柱底板 D1 (PL20×500×500) + 8-M20 化學錨栓 + D2 加勁板
            const bp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), basePlateMat);
            bp.position.set(x3d, 0.4, zCol);
            group.add(bp);

            // 鋼柱防撞護墊 (14 座，高 2.0m 鮮黃色包覆)
            const padMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.9, 0.46), safetyPadMat);
            padMesh.position.set(x3d, 0.42 + 0.95, zCol);
            padMesh.castShadow = true;
            group.add(padMesh);

            // 主鋼柱 SC1~SC7 (RH300×300×10×15 真實 H 型鋼斷面)
            const pBot = new THREE.Vector3(x3d, 0.42, zCol);
            const pTop = new THREE.Vector3(x3d, eaveTopY, zCol);
            const hCol = createHBeamBetween(pBot, pTop, 0.32, 0.3, 0.025, 0.035, steelPrimaryMat);
            group.add(hCol);
          }

          // 橫向雙坡/單坡大梁 SG1~SG6 (RH400×200×8×13) + 兩端柱頭斜隅加腋 Haunch H10
          if (effectiveSlope === 'gable') {
            const pWestEave = new THREE.Vector3(x3d, getCanopySurfaceY(0) - 0.26, -L / 2);
            const pRidge = new THREE.Vector3(x3d, getCanopySurfaceY(L / 2) - 0.26, 0);
            const pEastEave = new THREE.Vector3(x3d, getCanopySurfaceY(L) - 0.26, L / 2);

            group.add(
              createHBeamBetween(pWestEave, pRidge, 0.4, 0.2, 0.022, 0.032, steelPrimaryMat),
              createHBeamBetween(pRidge, pEastEave, 0.4, 0.2, 0.022, 0.032, steelPrimaryMat)
            );

            // 屋脊中央端板螺栓對接板 (PL19×380×682)
            const splicePlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.06), basePlateMat);
            splicePlate.position.set(x3d, getCanopySurfaceY(L / 2) - 0.32, 0);
            group.add(splicePlate);

            // 兩端梁柱斜隅加腋 (Haunch H10，長 2.0m)
            const hLen = Math.min(2.1, L * 0.1);
            const pHaunchB1 = new THREE.Vector3(x3d, getCanopySurfaceY(y2dBack) - 0.58, zBack + 0.12);
            const pHaunchB2 = new THREE.Vector3(x3d, getCanopySurfaceY(y2dBack + hLen) - 0.32, zBack + hLen);
            const pHaunchF1 = new THREE.Vector3(x3d, getCanopySurfaceY(y2dFront) - 0.58, zFront - 0.12);
            const pHaunchF2 = new THREE.Vector3(x3d, getCanopySurfaceY(y2dFront - hLen) - 0.32, zFront - hLen);
            group.add(
              createMemberBetween(pHaunchB1, pHaunchB2, 0.18, 0.22, steelPrimaryMat),
              createMemberBetween(pHaunchF1, pHaunchF2, 0.18, 0.22, steelPrimaryMat)
            );
          } else {
            const pBack = new THREE.Vector3(x3d, getCanopySurfaceY(0) - 0.26, -L / 2);
            const pFront = new THREE.Vector3(x3d, getCanopySurfaceY(L) - 0.26, L / 2);
            group.add(createHBeamBetween(pBack, pFront, 0.4, 0.2, 0.022, 0.032, steelPrimaryMat));
          }
        }

        // 1.3 縱向主繫梁 E1~E4 (軸 1、軸 3 屋脊、軸 5) 與 中間次梁 CP1~CP2 (軸 2、軸 4) + 柱列下層抗風縱梁 CP3~CP4 (+6.0m)
        const xFirst = frameX3DList[0];
        const xLast = frameX3DList[frameX3DList.length - 1];
        const y2dAxes = [
          y2dBack,
          y2dBack + (L / 2 - y2dBack) * 0.5,
          L / 2,
          L / 2 + (y2dFront - L / 2) * 0.5,
          y2dFront,
        ];
        y2dAxes.forEach((yAxis, idx) => {
          const zAxis = yAxis - L / 2;
          const yElev = getCanopySurfaceY(yAxis) - 0.28;
          const isMainTie = idx === 0 || idx === 2 || idx === 4;
          group.add(
            createHBeamBetween(
              new THREE.Vector3(xFirst, yElev, zAxis),
              new THREE.Vector3(xLast, yElev, zAxis),
              isMainTie ? 0.3 : 0.24,
              0.15,
              0.018,
              0.025,
              steelSecondaryMat
            )
          );
        });

        // 柱列下層抗風縱梁 CP3, CP4 (標高約 clearH * 0.82，雙層縱梁抗風)
        const lowerBeamY = Math.max(2.5, clearH * 0.84);
        for (const zCol of [zBack, zFront]) {
          group.add(
            createHBeamBetween(
              new THREE.Vector3(xFirst, lowerBeamY, zCol),
              new THREE.Vector3(xLast, lowerBeamY, zCol),
              0.24,
              0.13,
              0.016,
              0.022,
              steelSecondaryMat
            )
          );
        }

        // 1.4 屋面交叉風拉桿 BK1, BK2 (Ø16 圓鋼，配置於第 1 跨、中央第 3 跨、最末第 6 跨的 4 個坡段區間 = 共 24 支交叉風拉桿)
        const bracedBays = [0, Math.floor((numFrames - 1) / 2), numFrames - 2];
        bracedBays.forEach(bayIdx => {
          if (bayIdx < 0 || bayIdx >= frameX3DList.length - 1) return;
          const xa = frameX3DList[bayIdx];
          const xb = frameX3DList[bayIdx + 1];
          for (let sIdx = 0; sIdx < y2dAxes.length - 1; sIdx++) {
            const ya = y2dAxes[sIdx];
            const yb = y2dAxes[sIdx + 1];
            const za = ya - L / 2;
            const zb = yb - L / 2;
            const elevA = getCanopySurfaceY(ya) - 0.24;
            const elevB = getCanopySurfaceY(yb) - 0.24;

            const p1 = new THREE.Vector3(xa, elevA, za);
            const p2 = new THREE.Vector3(xb, elevB, zb);
            const p3 = new THREE.Vector3(xa, elevB, zb);
            const p4 = new THREE.Vector3(xb, elevA, za);

            group.add(
              createMemberBetween(p1, p2, 0.035, 0.035, braceRodMat, true),
              createMemberBetween(p3, p4, 0.035, 0.035, braceRodMat, true)
            );
          }
        });

        // 1.5 屋面 22 排 C150×50 檁條 (PP1~PP3，貫穿全長 -W/2 ~ +W/2)
        const numPurlins = 22;
        for (let ip = 0; ip < numPurlins; ip++) {
          const y2d = 0.25 + (ip / (numPurlins - 1)) * (L - 0.5);
          // 避開屋脊正中央分界
          const z3d = y2d - L / 2;
          const y3d = getCanopySurfaceY(y2d) - 0.1;
          const purlinMesh = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.06), purlinMat);
          purlinMesh.position.set(0, y3d, z3d);
          purlinMesh.rotation.x = getCanopyTiltSigned(y2d);
          group.add(purlinMesh);
        }

        // 1.6 +4.5m 懸挑設備平台 (軸 5 / A~B 柱間，向球場內側懸挑 1.5m，含 F1~F5 平台梁 + BR1 雙斜撐 + 花紋鋼板 + 安全護欄)
        const platX1 = frameX3DList[frameX3DList.length - 2];
        const platX2 = frameX3DList[frameX3DList.length - 1];
        const platMidX = (platX1 + platX2) / 2;
        const platSpanX = platX2 - platX1;
        const platY = Math.min(4.5, clearH * 0.65);
        const platDepth = 1.6;
        const zPlatOuter = zFront;
        const zPlatInner = zFront - platDepth;

        // 平台托梁 F1, F2, F5 與縱梁 F3, F4 + 斜撐 BR1 (2支)
        for (const px of [platX1, platMidX, platX2]) {
          group.add(
            createMemberBetween(
              new THREE.Vector3(px, platY, zPlatOuter),
              new THREE.Vector3(px, platY, zPlatInner),
              0.12,
              0.15,
              steelPrimaryMat
            )
          );
        }
        // BR1 雙斜撐 (由柱身 +3.0m 斜撐至平台前端)
        for (const px of [platX1, platX2]) {
          group.add(
            createMemberBetween(
              new THREE.Vector3(px, Math.max(1.8, platY - 1.5), zPlatOuter),
              new THREE.Vector3(px, platY - 0.05, zPlatInner + 0.1),
              0.12,
              0.12,
              steelPrimaryMat
            )
          );
        }
        // 平台花紋鋼板 D21/D22 與四周安全欄杆
        const deckMesh = new THREE.Mesh(
          new THREE.BoxGeometry(platSpanX + 0.2, 0.08, platDepth),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 })
        );
        deckMesh.position.set(platMidX, platY + 0.08, (zPlatOuter + zPlatInner) / 2);
        group.add(deckMesh);

        const railMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.4 });
        for (const rh of [0.55, 1.05]) {
          const frontRail = new THREE.Mesh(new THREE.BoxGeometry(platSpanX + 0.2, 0.04, 0.04), railMat);
          frontRail.position.set(platMidX, platY + 0.1 + rh, zPlatInner);
          group.add(frontRail);
        }
        for (const px of [platX1, platMidX, platX2]) {
          const postR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), railMat);
          postR.position.set(px, platY + 0.65, zPlatInner);
          group.add(postR);
        }

        // =====================================================================
        // 1.7 ★ 嚴格對齊《結構安裝圖 Page 1、2》：
        //     西南角護籠爬梯 (設於 G 軸南側山牆端 × 軸 1 交角 SC4 柱南側懸挑端，直通 G 軸南端橫向維修走道)
        // =====================================================================
        const ladderYellowMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.4,
          roughness: 0.3,
        });
        const ladderOrangeMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          metalness: 0.45,
          roughness: 0.3,
        });
        const bracketMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.65,
          roughness: 0.3,
        });
        const catwalkFrameMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b, // 醒目工安橘黃色角鐵邊框與踢腳板
          metalness: 0.45,
          roughness: 0.35,
        });
        const catwalkMeshMat = new THREE.MeshStandardMaterial({
          color: 0x64748b, // 鍍鋅菱形擴張網底板
          metalness: 0.65,
          roughness: 0.35,
        });
        const catwalkGridMat = new THREE.MeshBasicMaterial({
          color: 0xe2e8f0, // 菱形網格高光格線
        });

        // 依據所有活性模組座標，精算出西側 G 軸山牆外緣與中央屋脊留空走道的真實無重疊區間
        const activeMods = panelsData.filter(p => p.isActive);
        const minPanelX2D = activeMods.length > 0 ? Math.min(...activeMods.map(p => p.x)) : 1.0;
        const maxPanelX2D = activeMods.length > 0 ? Math.max(...activeMods.map(p => p.x + p.w)) : W - 1.0;
        const minPanelX3D = minPanelX2D - W / 2;
        const maxPanelX3D = maxPanelX2D - W / 2;

        // 西端（對應圖面南端 G 軸山牆懸挑端）橫向維修走道中心 X 座標：完全位於西側屋面邊緣 (-W/2) 與第一排模組 (minPanelX3D) 之間的留空帶！
        const gEndWalkWidth = Math.min(0.68, Math.max(0.42, (minPanelX2D - 0.15) * 0.72));
        const gEndWalkX = -W / 2 + 0.12 + gEndWalkWidth / 2;

        // 護籠爬梯位置：嚴格設於西南角（G 軸山牆端外緣 x = -W/2 - 0.38，對齊軸 1 柱列 y2dBack，面向東側 G 軸山牆橫向維修走道登頂）
        const ladWidth = 0.6;
        const ladX = -W / 2 - 0.38; // 位於 G 軸山牆懸挑端外側
        const ladY2D = y2dBack + 0.35; // 緊鄰軸 1 / G 柱 (SC4) 位置
        const ladZ = ladY2D - L / 2;
        const roofAtLadderY = getCanopySurfaceY(ladY2D);
        const ladLandingY = roofAtLadderY + 0.06; // 與屋面 G 軸橫向走道齊平銜接
        const ladTopHandrailY = ladLandingY + 1.1; // 梯頂鵝頸安全扶手高程

        // (a) 左右兩支主立管 (沿 Z 軸寬度排開，人員面向 +X 攀爬直上 G 軸山牆橫向走道)
        const railL = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, ladTopHandrailY, 12),
          ladderYellowMat
        );
        railL.position.set(ladX, ladTopHandrailY / 2, ladZ - ladWidth / 2);
        railL.castShadow = true;
        const railR = railL.clone();
        railR.position.set(ladX, ladTopHandrailY / 2, ladZ + ladWidth / 2);
        group.add(railL, railR);

        // (b) 加密防滑踏棍 (間距 0.30m)
        for (let ry = 0.3; ry <= ladLandingY; ry += 0.3) {
          const rung = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, ladWidth, 10),
            ladderOrangeMat
          );
          rung.rotation.x = Math.PI / 2;
          rung.position.set(ladX, ry, ladZ);
          group.add(rung);
        }

        // (c) 爬梯與 SC4 (軸 1/G 主鋼柱) 之間的鋼構固定支撐托架
        for (let by = 1.4; by <= roofAtLadderY - 0.2; by += 1.7) {
          for (const dz of [-ladWidth / 2, ladWidth / 2]) {
            group.add(
              createMemberBetween(
                new THREE.Vector3(xFirst, by, zBack),
                new THREE.Vector3(ladX, by, ladZ + dz),
                0.045,
                0.055,
                bracketMat
              )
            );
          }
          const tiePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, ladWidth + 0.06), bracketMat);
          tiePlate.position.set(ladX + 0.08, by, ladZ);
          group.add(tiePlate);
        }

        // (d) 立體防墜安全護籠 (自離地 2.2m 起至 ladTopHandrailY - 0.15m，包覆於爬梯外側 -X 方向)
        const cageStartY = 2.2;
        const cageEndY = ladTopHandrailY - 0.15;
        const cageRadius = 0.42;
        const cageCenterX = ladX - 0.34;
        const cageCenterZ = ladZ;

        for (let hy = cageStartY; hy <= cageEndY; hy += 0.6) {
          const hoop = new THREE.Mesh(
            new THREE.TorusGeometry(cageRadius, 0.018, 10, 24, Math.PI * 1.45),
            ladderYellowMat
          );
          hoop.rotation.x = Math.PI / 2;
          hoop.rotation.z = Math.PI * 0.275;
          hoop.position.set(cageCenterX, hy, cageCenterZ);
          hoop.castShadow = true;
          group.add(hoop);

          for (const side of [-1, 1]) {
            const pHoopEnd = new THREE.Vector3(
              cageCenterX + cageRadius * 0.65,
              hy,
              cageCenterZ + side * (cageRadius * 0.75)
            );
            const pRail = new THREE.Vector3(ladX, hy, ladZ + side * (ladWidth / 2));
            group.add(createMemberBetween(pHoopEnd, pRail, 0.022, 0.036, ladderYellowMat));
          }
        }

        // 8 支垂直護籠縱向扁鋼條
        const cageAngles = [-125, -90, -55, -20, 20, 55, 90, 125];
        cageAngles.forEach(deg => {
          const rad = (deg * Math.PI) / 180;
          const vx = cageCenterX - Math.cos(rad) * cageRadius;
          const vz = cageCenterZ + Math.sin(rad) * cageRadius;
          const vBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.022, cageEndY - cageStartY, 0.036),
            ladderOrangeMat
          );
          vBar.position.set(vx, (cageStartY + cageEndY) / 2, vz);
          vBar.castShadow = true;
          group.add(vBar);
        });

        // (e) 爬梯頂部登頂轉接踏台與鵝頸扶手 (直接連通 G 軸南端山牆橫向維修走道起點)
        const landingLenX = Math.abs(gEndWalkX - ladX) + gEndWalkWidth / 2;
        const landingCenterX = (ladX + gEndWalkX) / 2;
        const landingPlatform = new THREE.Mesh(
          new THREE.BoxGeometry(landingLenX, 0.05, ladWidth + 0.16),
          catwalkMeshMat
        );
        landingPlatform.position.set(landingCenterX, ladLandingY, ladZ);
        group.add(landingPlatform);

        for (const side of [-1, 1]) {
          const zRail = ladZ + side * (ladWidth / 2 + 0.04);
          group.add(
            createMemberBetween(
              new THREE.Vector3(ladX, ladTopHandrailY, zRail),
              new THREE.Vector3(gEndWalkX, ladTopHandrailY, zRail),
              0.032,
              0.032,
              ladderYellowMat,
              true
            ),
            createMemberBetween(
              new THREE.Vector3(ladX, ladLandingY + 0.52, zRail),
              new THREE.Vector3(gEndWalkX, ladLandingY + 0.52, zRail),
              0.024,
              0.024,
              ladderOrangeMat,
              true
            ),
            createMemberBetween(
              new THREE.Vector3(gEndWalkX, ladLandingY, zRail),
              new THREE.Vector3(gEndWalkX, ladTopHandrailY, zRail),
              0.03,
              0.03,
              ladderYellowMat,
              true
            )
          );
        }

        // =====================================================================
        // 1.8 ★ 嚴格對齊《結構安裝圖 Page 1》：L 型兩條菱形擴張網維修走道 (60.8m，與模組 0 重疊！)
        //   ① G 軸南端山牆橫向維修走道：位於 G 軸懸挑端邊緣（第 19 排模組外側留空區，絕不壓在模組上），
        //      自西南角護籠爬梯登頂口 (ladY2D) 順坡向上直達中央屋脊 (L/2) 並延伸至軸 5 (y2dFront)。
        //   ② 軸 3 中央屋脊縱向主維修走道：位於東西兩坡模組陣列正中央的留空走道區 (z = 0)，
        //      自 G 軸橫向走道一路貫穿至北端 A 軸。
        // =====================================================================
        // 計算中央屋脊兩側模組的真實留空淨寬，確保屋脊走道完全落在模組間隙內，絕不與模組重疊
        const northHalfMods = activeMods.filter(p => p.y + p.h <= L / 2 + 0.05);
        const southHalfMods = activeMods.filter(p => p.y >= L / 2 - 0.05);
        const gapNorthZ =
          northHalfMods.length > 0
            ? Math.max(...northHalfMods.map(p => p.y + p.h)) - L / 2
            : -0.35;
        const gapSouthZ =
          southHalfMods.length > 0
            ? Math.min(...southHalfMods.map(p => p.y)) - L / 2
            : 0.35;
        const availableRidgeGap = Math.max(0.36, gapSouthZ - gapNorthZ - 0.08);
        const catwalkWidth = Math.min(0.62, availableRidgeGap);
        const ridgeWalkCenterZ = (gapNorthZ + gapSouthZ) / 2;
        const ridgeY = getCanopySurfaceY(L / 2) + 0.06;

        // --- ② 軸 3 中央屋脊縱向主維修走道 (沿 X 軸自 G 軸橫向走道 gEndWalkX 貫穿至東端 maxPanelX3D + 0.3) ---
        const ridgeStartX = gEndWalkX - gEndWalkWidth / 2;
        const ridgeEndX = Math.min(W / 2 - 0.25, maxPanelX3D + 0.35);
        const ridgeWalkLen = Math.max(1, ridgeEndX - ridgeStartX);
        const ridgeWalkCenterX = (ridgeStartX + ridgeEndX) / 2;

        const ridgeDeck = new THREE.Mesh(
          new THREE.BoxGeometry(ridgeWalkLen, 0.035, catwalkWidth),
          catwalkMeshMat
        );
        ridgeDeck.position.set(ridgeWalkCenterX, ridgeY, ridgeWalkCenterZ);
        ridgeDeck.castShadow = true;
        ridgeDeck.receiveShadow = true;
        group.add(ridgeDeck);

        // 屋脊走道雙側橘黃色角鐵邊框與踢腳板
        for (const side of [-1, 1]) {
          const zCurb = ridgeWalkCenterZ + side * (catwalkWidth / 2 + 0.018);
          const curb = new THREE.Mesh(
            new THREE.BoxGeometry(ridgeWalkLen, 0.085, 0.036),
            catwalkFrameMat
          );
          curb.position.set(ridgeWalkCenterX, ridgeY + 0.025, zCurb);
          group.add(curb);
        }

        // 屋脊走道菱形擴張網格肋條與下方中脊支撐鞍座
        const numRidgeCrossBars = Math.max(14, Math.round(ridgeWalkLen / 0.7));
        for (let ic = 0; ic <= numRidgeCrossBars; ic++) {
          const cx = ridgeStartX + (ic / numRidgeCrossBars) * ridgeWalkLen;
          const rib = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.044, catwalkWidth - 0.02),
            catwalkGridMat
          );
          rib.position.set(cx, ridgeY + 0.004, ridgeWalkCenterZ);
          group.add(rib);

          if (ic % 2 === 0) {
            const saddle = new THREE.Mesh(
              new THREE.BoxGeometry(0.07, 0.09, catwalkWidth + 0.08),
              bracketMat
            );
            saddle.position.set(cx, ridgeY - 0.045, ridgeWalkCenterZ);
            group.add(saddle);
          }
        }
        for (const zOff of [-catwalkWidth * 0.26, 0, catwalkWidth * 0.26]) {
          const longRib = new THREE.Mesh(
            new THREE.BoxGeometry(ridgeWalkLen, 0.042, 0.022),
            catwalkGridMat
          );
          longRib.position.set(ridgeWalkCenterX, ridgeY + 0.004, ridgeWalkCenterZ + zOff);
          group.add(longRib);
        }

        // --- ① G 軸南端山牆懸挑邊緣橫向維修走道 (位於模組外側 gEndWalkX，自爬梯口 ladY2D -> 屋脊 L/2 -> 軸 5 y2dFront) ---
        const gSlopeSegments: [number, number][] =
          effectiveSlope === 'gable'
            ? [
                [ladY2D, L / 2],
                [L / 2, y2dFront],
              ]
            : [[ladY2D, y2dFront]];

        gSlopeSegments.forEach(([yStart2D, yEnd2D]) => {
          const zStart = yStart2D - L / 2;
          const zEnd = yEnd2D - L / 2;
          const elevStart = getCanopySurfaceY(yStart2D) + 0.06;
          const elevEnd = getCanopySurfaceY(yEnd2D) + 0.06;

          const pStart = new THREE.Vector3(gEndWalkX, elevStart, zStart);
          const pEnd = new THREE.Vector3(gEndWalkX, elevEnd, zEnd);

          // 兩側橘黃色角鐵邊框
          for (const side of [-1, 1]) {
            const xSide = gEndWalkX + side * (gEndWalkWidth / 2);
            group.add(
              createMemberBetween(
                new THREE.Vector3(xSide, elevStart + 0.02, zStart),
                new THREE.Vector3(xSide, elevEnd + 0.02, zEnd),
                0.04,
                0.085,
                catwalkFrameMat
              )
            );
          }

          // 底部菱形擴張網走道板 + 水平防滑踏階
          group.add(
            createMemberBetween(pStart, pEnd, gEndWalkWidth - 0.03, 0.032, catwalkMeshMat)
          );

          const segHorizLen = Math.abs(yEnd2D - yStart2D);
          const stepCount = Math.max(6, Math.round(segHorizLen / 0.55));
          for (let is = 0; is <= stepCount; is++) {
            const t = is / stepCount;
            const yCurr2D = yStart2D + t * (yEnd2D - yStart2D);
            const zCurr = yCurr2D - L / 2;
            const elevCurr = getCanopySurfaceY(yCurr2D) + 0.08;

            const stepPlank = new THREE.Mesh(
              new THREE.BoxGeometry(gEndWalkWidth - 0.04, 0.03, 0.24),
              catwalkMeshMat
            );
            stepPlank.position.set(gEndWalkX, elevCurr, zCurr);

            const stepNose = new THREE.Mesh(
              new THREE.BoxGeometry(gEndWalkWidth - 0.02, 0.036, 0.035),
              ladderYellowMat
            );
            stepNose.position.set(gEndWalkX, elevCurr + 0.004, zCurr + (yEnd2D > yStart2D ? -0.11 : 0.11));
            group.add(stepPlank, stepNose);
          }
        });

        // =====================================================================
        // ★ 屋面清浪板、30cm白鐵水槽、菱形網維修步道、四周安全母索、鋁軌腳座、逆變器與1F附CT電表箱
        // =====================================================================
        if (showMepAndRoof) {
          // 3.1 半透明 0.6mm 四合一清浪板 + 屋脊中脊板
          const sheetMat = new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            metalness: 0.35,
            roughness: 0.4,
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide,
          });
          if (effectiveSlope === 'gable') {
            const halfSlopeLen = (L / 2) / Math.cos(tiltRad);
            const sheetBack = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, halfSlopeLen), sheetMat);
            sheetBack.position.set(0, getCanopySurfaceY(L * 0.25) - 0.03, -L * 0.25);
            sheetBack.rotation.x = -tiltRad;

            const sheetFront = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, halfSlopeLen), sheetMat);
            sheetFront.position.set(0, getCanopySurfaceY(L * 0.75) - 0.03, L * 0.25);
            sheetFront.rotation.x = tiltRad;

            const ridgeCap = new THREE.Mesh(
              new THREE.BoxGeometry(W, 0.03, 0.6),
              new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.35 })
            );
            ridgeCap.position.set(0, getCanopySurfaceY(L / 2) - 0.01, 0);
            group.add(sheetBack, sheetFront, ridgeCap);
          }

          // 3.2 兩側屋簷 30cm 白鐵排水水槽
          const gutterMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.25 });
          for (const zG of [-L / 2 - 0.15, L / 2 + 0.15]) {
            const gMesh = new THREE.Mesh(new THREE.BoxGeometry(W, 0.16, 0.28), gutterMat);
            gMesh.position.set(0, getCanopySurfaceY(0) - 0.12, zG);
            group.add(gMesh);
          }

          // ===================================================================
          // 3.4 ★ 嚴格對齊《結構安裝圖 Page 9：安全母鎖示意圖 (附件1)》與預算書 (115.8m 全周長)：
          //     屋面四周完整封閉之防墜安全母索圍籬 (轴 1 長邊 + 軸 5 長邊 + 軸 A 北山牆雙坡 + 軸 G 南山牆雙坡)
          //     - 立柱規格：高 1.0m (1米) 角鐵立柱，間距 2.5m (250cm)
          //     - 內側斜撐：每支立柱底部往屋面內側設 50cm 角鐵斜撐 (A-A 側視圖，底部水平角鐵座長 850~950mm)
          //     - 雙層母索：高 50cm 與 100cm 兩道不鏽鋼安全母索圍繞屋面全周長 (僅於西南角爬梯登頂入口留設開口)
          // ===================================================================
          const lifelinePostMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626, // 醒目工安紅角鐵立柱與 50cm 內向斜撐
            metalness: 0.45,
            roughness: 0.35,
          });
          const lifelineCableMat = new THREE.MeshStandardMaterial({
            color: 0xfacc15, // 高可視度黃色/不鏽鋼雙層安全母索鋼索
            metalness: 0.6,
            roughness: 0.25,
          });

          const postH = 1.0; // 圖面標示：1米
          const braceH = 0.5; // 圖面標示：50CM 斜撐
          const braceRun = 0.5;
          const marginX = 0.18;
          const marginY = 0.22;

          // (1) 南北兩長邊屋簷邊緣 (yEdge = marginY [軸 1 側] 與 yEdge = L - marginY [軸 5 側]，全長 W - 2*marginX)
          const postCountX = Math.max(8, Math.round((W - 2 * marginX) / 2.5));
          for (const isFrontEdge of [false, true]) {
            const yEdge = isFrontEdge ? L - marginY : marginY;
            const zEdge = yEdge - L / 2;
            const yBase = getCanopySurfaceY(yEdge);
            const inwardDirZ = isFrontEdge ? -1 : 1; // 斜撐朝向屋面內側 (如圖 Page 9 左下 1、5 軸剖面圖)

            const edgePosts: THREE.Vector3[] = [];
            for (let i = 0; i <= postCountX; i++) {
              const px = -W / 2 + marginX + (i / postCountX) * (W - 2 * marginX);
              edgePosts.push(new THREE.Vector3(px, yBase, zEdge));

              // 1.0m 垂直角鐵立柱
              const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, postH, 0.045), lifelinePostMat);
              post.position.set(px, yBase + postH / 2, zEdge);
              group.add(post);

              // 50cm 內向斜撐 + 850mm 底部水平角鐵固定座 (A-A 側視圖)
              const pBraceTop = new THREE.Vector3(px, yBase + braceH, zEdge);
              const pBraceBot = new THREE.Vector3(
                px,
                getCanopySurfaceY(yEdge + inwardDirZ * braceRun),
                zEdge + inwardDirZ * braceRun
              );
              const pBasePlateEnd = new THREE.Vector3(
                px,
                getCanopySurfaceY(yEdge + inwardDirZ * 0.85),
                zEdge + inwardDirZ * 0.85
              );
              group.add(
                createMemberBetween(pBraceTop, pBraceBot, 0.035, 0.035, lifelinePostMat),
                createMemberBetween(new THREE.Vector3(px, yBase + 0.02, zEdge), pBasePlateEnd, 0.04, 0.03, lifelinePostMat)
              );
            }

            // 穿設 50cm 與 100cm 雙層水平安全母索
            for (let i = 0; i < edgePosts.length - 1; i++) {
              const pA = edgePosts[i];
              const pB = edgePosts[i + 1];
              for (const dh of [0.5, 0.96]) {
                group.add(
                  createMemberBetween(
                    new THREE.Vector3(pA.x, pA.y + dh, pA.z),
                    new THREE.Vector3(pB.x, pB.y + dh, pB.z),
                    0.018,
                    0.018,
                    lifelineCableMat,
                    true
                  )
                );
              }
            }
          }

          // (2) 東西兩端山牆斜坡邊緣 (xEdge = -W/2 + marginX [G 軸南端山牆] 與 xEdge = +W/2 - marginX [A 軸北端山牆])
          const postCountZ = Math.max(6, Math.round((L - 2 * marginY) / 2.5));
          for (const isEastGable of [false, true]) {
            const xEdge = isEastGable ? W / 2 - marginX : -W / 2 + marginX;
            const inwardDirX = isEastGable ? -1 : 1; // 斜撐朝向屋面內側

            const gablePosts: { pos: THREE.Vector3; y2d: number }[] = [];
            for (let j = 0; j <= postCountZ; j++) {
              const y2d = marginY + (j / postCountZ) * (L - 2 * marginY);
              const zPos = y2d - L / 2;
              const yBase = getCanopySurfaceY(y2d);
              gablePosts.push({ pos: new THREE.Vector3(xEdge, yBase, zPos), y2d });

              // 若位於西南角爬梯登頂入口處 (G 軸山牆 & 靠近 ladY2D)，留設人員出入開口不立柱
              if (!isEastGable && Math.abs(y2d - ladY2D) < 0.55) {
                continue;
              }

              // 1.0m 垂直角鐵立柱
              const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, postH, 0.045), lifelinePostMat);
              post.position.set(xEdge, yBase + postH / 2, zPos);
              group.add(post);

              // 50cm 內向斜撐 + 底部角鐵座
              const pBraceTop = new THREE.Vector3(xEdge, yBase + braceH, zPos);
              const pBraceBot = new THREE.Vector3(xEdge + inwardDirX * braceRun, yBase, zPos);
              group.add(
                createMemberBetween(pBraceTop, pBraceBot, 0.035, 0.035, lifelinePostMat)
              );
            }

            // 沿山牆雙坡邊緣穿設 50cm 與 100cm 雙層安全母索 (自動順應雙坡屋脊折角，並避開爬梯登頂入口)
            for (let j = 0; j < gablePosts.length - 1; j++) {
              const ptA = gablePosts[j];
              const ptB = gablePosts[j + 1];
              // 爬梯出入口區段留空供人員進入 G 軸橫向走道
              if (
                !isEastGable &&
                (Math.abs(ptA.y2d - ladY2D) < 0.55 || Math.abs(ptB.y2d - ladY2D) < 0.55)
              ) {
                continue;
              }
              for (const dh of [0.5, 0.96]) {
                group.add(
                  createMemberBetween(
                    new THREE.Vector3(ptA.pos.x, ptA.pos.y + dh, ptA.pos.z),
                    new THREE.Vector3(ptB.pos.x, ptB.pos.y + dh, ptB.pos.z),
                    0.018,
                    0.018,
                    lifelineCableMat,
                    true
                  )
                );
              }
            }
          }

          // 3.5 設備平台上的新望變流器 INV-1 (110kW)、INV-2 (30kW)、DC-1/2、AC-1 盤、#A 屋脊鋁線槽、#C/#D 橘色 RSG 幹線管、1F 3P4W 附 CT 雙門電表箱
          const invBodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.3 });
          const panelBoxMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.5 });
          const conduitMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.4 });

          // INV-1 (110kW) & INV-2 (30kW) on platform
          const inv1 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.68, 0.35), invBodyMat);
          inv1.position.set(platMidX + 0.7, platY + 1.1, zPlatOuter - 0.25);
          const inv2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.28), invBodyMat);
          inv2.position.set(platMidX - 0.8, platY + 1.05, zPlatOuter - 0.25);
          // DC-1, DC-2 & AC-1 boxes
          const dc1Box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.25), panelBoxMat);
          dc1Box.position.set(platX2 - 0.5, platY + 1.0, zPlatOuter - 0.25);
          const ac1Box = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.98, 0.32), panelBoxMat);
          ac1Box.position.set(platMidX, platY + 0.7, zPlatInner + 0.25);
          group.add(inv1, inv2, dc1Box, ac1Box);

          // #A 屋脊中央 100×100mm DC 主幹鋁線槽
          const trayA = new THREE.Mesh(
            new THREE.BoxGeometry(W - 1.2, 0.1, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 })
          );
          trayA.position.set(0, getCanopySurfaceY(L / 2) + 0.08, 0.38);
          group.add(trayA);

          // 1F 東北側地面新設 3Φ4W 低壓附 CT 雙門不鏽鋼電表箱 (寬 1350 × 高 2150 × 深 500 mm)
          const meterX = xLast + 2.2;
          const meterZ = zFront - 0.4;
          const meterBox = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 2.15, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.3 })
          );
          meterBox.position.set(meterX, 1.08, meterZ);
          const meterWindow = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.3, 0.54),
            new THREE.MeshStandardMaterial({ color: 0xef4444 })
          );
          meterWindow.position.set(meterX - 0.3, 1.55, meterZ);
          group.add(meterBox, meterWindow);

          // #C & #D Ø82mm RSG 橘色金屬管幹線 (由平台 AC-1 沿東側最後一支鋼柱垂直下地再連至 1F 電表箱)
          group.add(
            createMemberBetween(
              new THREE.Vector3(platX2 + 0.18, platY + 0.3, zFront),
              new THREE.Vector3(platX2 + 0.18, 0.1, zFront),
              0.1,
              0.1,
              conduitMat,
              true
            ),
            createMemberBetween(
              new THREE.Vector3(platX2 + 0.18, 0.12, zFront),
              new THREE.Vector3(meterX, 0.12, meterZ),
              0.1,
              0.1,
              conduitMat,
              true
            )
          );
        }
      } else {
        // =====================================================================
        // 其他五大太陽能產品 (①魚電室外、②魚電室內、④屋頂棚架、⑤屋頂平鋪、⑥地面型) 鋼構與支架系統
        // =====================================================================
        const steelColor = productType === 'roof_flush' ? 0x94a3b8 : 0x475569;
        const steelMat = new THREE.MeshStandardMaterial({
          color: steelColor,
          metalness: 0.55,
          roughness: 0.35,
        });
        const pierMat = new THREE.MeshStandardMaterial({
          color: 0xd6d3d1,
          roughness: 0.85,
        });

        if (productType === 'roof_flush') {
          const colSpan = Math.max(2.5, W / 8);
          for (let x = 0.8; x <= W - 0.8; x += colSpan) {
            for (const seg of effectiveSlope === 'gable' ? [0.25, 0.75] : [0.5]) {
              const yMid = L * seg;
              if (!isInsideFootprint(x, yMid)) continue;
              const segLen = effectiveSlope === 'gable' ? L * 0.46 : L * 0.92;
              const tilt = getCanopyTiltSigned(yMid);
              const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, segLen / Math.cos(Math.abs(tilt))),
                steelMat
              );
              rail.position.set(x - W / 2, getCanopySurfaceY(yMid) - 0.06, yMid - L / 2);
              rail.rotation.x = tilt;
              group.add(rail);
            }
          }
        } else if (productType === 'ground_mount' && groundMountStyle === 'rows') {
          const activePanels = panelsData.filter(p => p.isActive);
          const rowsByY = new Map<string, PanelItem2D[]>();
          activePanels.forEach(p => {
            const key = p.y.toFixed(2);
            if (!rowsByY.has(key)) rowsByY.set(key, []);
            rowsByY.get(key)!.push(p);
          });

          rowsByY.forEach(rowPanels => {
            if (rowPanels.length === 0) return;
            const minX = Math.min(...rowPanels.map(p => p.x));
            const maxX = Math.max(...rowPanels.map(p => p.x + p.w));
            const y0 = rowPanels[0].y;
            const ph = rowPanels[0].h;

            const lowH = clearH;
            const highH = clearH + ph * Math.sin(tiltRad);
            const zFront = y0 + ph * 0.82 - L / 2;
            const zBack = y0 + ph * 0.18 - L / 2;

            const postStep = Math.max(2.5, (maxX - minX) / Math.max(1, Math.ceil((maxX - minX) / 3.5)));
            for (let px = minX + 0.3; px <= maxX - 0.1; px += postStep) {
              const x3d = px - W / 2;
              const pierF = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), pierMat);
              pierF.position.set(x3d, 0.15, zFront);
              const postF = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, lowH, 8), steelMat);
              postF.position.set(x3d, lowH / 2, zFront);

              const pierB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), pierMat);
              pierB.position.set(x3d, 0.15, zBack);
              const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, highH, 8), steelMat);
              postB.position.set(x3d, highH / 2, zBack);

              const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, ph * 0.95), steelMat);
              rafter.position.set(x3d, (lowH + highH) / 2 - 0.04, y0 + ph / 2 - L / 2);
              rafter.rotation.x = tiltRad;

              group.add(pierF, postF, pierB, postB, rafter);
            }

            const rowSpan = maxX - minX;
            const purlin1 = new THREE.Mesh(new THREE.BoxGeometry(rowSpan, 0.06, 0.06), steelMat);
            purlin1.position.set((minX + maxX) / 2 - W / 2, lowH + (highH - lowH) * 0.25, zFront);
            const purlin2 = new THREE.Mesh(new THREE.BoxGeometry(rowSpan, 0.06, 0.06), steelMat);
            purlin2.position.set((minX + maxX) / 2 - W / 2, lowH + (highH - lowH) * 0.75, zBack);
            group.add(purlin1, purlin2);
          });
        } else {
          // ① 魚電室外、② 魚電室內、④ 屋頂棚架、⑥ 地面型(連續棚架)
          const numColsX = Math.max(2, Math.round(W / 5.5) + 1);
          const numColsZ = Math.max(2, Math.round(L / 6) + 1);
          const colSpacingX = (W - 1.2) / (numColsX - 1);
          const colSpacingZ = (L - 1.2) / (numColsZ - 1);
          const colW = productType === 'fish_outdoor' ? 0.24 : 0.2;
          const pierH = productType === 'fish_outdoor' ? 1.1 : productType === 'roof_canopy' ? 0.65 : 0.45;

          for (let ix = 0; ix < numColsX; ix++) {
            const x2d = 0.6 + ix * colSpacingX;
            const x3d = x2d - W / 2;

            for (let iz = 0; iz < numColsZ; iz++) {
              const isBoundaryZ = iz === 0 || iz === numColsZ - 1;
              if (productType === 'fish_indoor' && !isBoundaryZ) {
                continue;
              }

              const y2d = 0.6 + iz * colSpacingZ;
              if (!isInsideFootprint(x2d, y2d)) continue;

              const topY = getCanopySurfaceY(y2d) - 0.14;
              const colHeight = Math.max(0.5, topY - baseElevation);
              const z3d = y2d - L / 2;

              const pier = new THREE.Mesh(new THREE.BoxGeometry(colW * 2.2, pierH, colW * 2.2), pierMat);
              pier.position.set(x3d, baseElevation + pierH / 2, z3d);
              pier.castShadow = true;
              group.add(pier);

              const hCol = createHBeamBetween(
                new THREE.Vector3(x3d, baseElevation + pierH, z3d),
                new THREE.Vector3(x3d, baseElevation + colHeight, z3d),
                colW,
                colW,
                0.02,
                0.03,
                steelMat
              );
              group.add(hCol);
            }

            if (effectiveSlope === 'gable') {
              const halfL = (L - 0.8) / 2;
              const hyp = halfL / Math.cos(tiltRad);
              const yMidF = L * 0.75;
              if (isInsideFootprint(x2d, yMidF)) {
                const rafF = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.24, hyp), steelMat);
                rafF.position.set(x3d, getCanopySurfaceY(yMidF) - 0.14, yMidF - L / 2);
                rafF.rotation.x = tiltRad;
                group.add(rafF);
              }
              const yMidB = L * 0.25;
              if (isInsideFootprint(x2d, yMidB)) {
                const rafB = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.24, hyp), steelMat);
                rafB.position.set(x3d, getCanopySurfaceY(yMidB) - 0.14, yMidB - L / 2);
                rafB.rotation.x = -tiltRad;
                group.add(rafB);
              }
            } else {
              const hyp = (L - 0.8) / Math.cos(tiltRad);
              const yMid = L * 0.5;
              if (isInsideFootprint(x2d, yMid)) {
                const raf = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.24, hyp), steelMat);
                raf.position.set(x3d, getCanopySurfaceY(yMid) - 0.14, 0);
                raf.rotation.x = tiltRad;
                group.add(raf);
              }
            }
          }

          const purlinCount = Math.max(6, Math.round(L / 1.5));
          for (let ip = 0; ip <= purlinCount; ip++) {
            const y2d = 0.5 + (ip / purlinCount) * (L - 1.0);
            let xStart = 0.4;
            let xEnd = W - 0.4;
            if (siteShape === 'l-shape' && y2d < cl) {
              xEnd = Math.max(xStart, W - cw - 0.4);
            }
            const spanW = xEnd - xStart;
            if (spanW > 0.5 && !(siteShape === 'u-shape' && y2d < cl)) {
              const purlin = new THREE.Mesh(new THREE.BoxGeometry(spanW, 0.08, 0.08), steelMat);
              purlin.position.set((xStart + xEnd) / 2 - W / 2, getCanopySurfaceY(y2d) - 0.04, y2d - L / 2);
              purlin.rotation.x = getCanopyTiltSigned(y2d);
              group.add(purlin);
            }
          }
        }
      }
    }

    // =========================================================================
    // 3. SOLAR MODULES (3D 太陽能模組陣列 — 與 2D 排佈完全同步)
    // =========================================================================
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.7,
      roughness: 0.25,
    });
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x172554,
      metalness: 0.48,
      roughness: 0.18,
      emissive: 0x0f172a,
      emissiveIntensity: 0.15,
    });
    const gridLineMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });

    panelsData.forEach(panel => {
      if (!panel.isActive) return;

      const centerX2D = panel.x + panel.w / 2;
      const centerY2D = panel.y + panel.h / 2;
      const x3d = centerX2D - W / 2;
      const z3d = centerY2D - L / 2;

      let y3d = getCanopySurfaceY(centerY2D) + 0.05;
      let panelTilt = getCanopyTiltSigned(centerY2D);

      if (productType === 'ground_mount' && groundMountStyle === 'rows') {
        const lowH = clearH;
        const highH = clearH + panel.h * Math.sin(tiltRad);
        y3d = (lowH + highH) / 2 + 0.05;
        panelTilt = tiltRad;
      }

      const pg = new THREE.Group();
      pg.position.set(x3d, y3d, z3d);
      pg.rotation.x = panelTilt;

      const frameGeo = new THREE.BoxGeometry(panel.w, 0.045, panel.h);
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      pg.add(frameMesh);

      const cellGeo = new THREE.BoxGeometry(Math.max(0.05, panel.w - 0.05), 0.052, Math.max(0.05, panel.h - 0.05));
      const cellMesh = new THREE.Mesh(cellGeo, cellMat);
      pg.add(cellMesh);

      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.056, panel.h - 0.06), gridLineMat);
      bar1.position.x = -panel.w * 0.17;
      const bar2 = bar1.clone();
      bar2.position.x = panel.w * 0.17;
      pg.add(bar1, bar2);

      group.add(pg);
    });
  }, [
    productType,
    W,
    L,
    siteShape,
    cutoutWidth,
    cutoutLength,
    clearH,
    tiltRad,
    slopeType,
    bldgH,
    groundMountStyle,
    panelsData,
    showStructure,
    showMepAndRoof,
    showEnvironment,
  ]);

  const setCameraPreset = (preset: 'iso' | 'front' | 'side' | 'top' | 'ladder') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const maxDim = Math.max(W, L);
    const targetY = productType === 'roof_canopy' || productType === 'roof_flush' ? bldgH * 0.7 : 3.2;

    if (preset === 'ladder') {
      // 特寫聚焦於西南角安全護籠爬梯、登頂轉接踏台、西端斜坡階梯走道與屋脊主走道交會處
      controlsRef.current.target.set(-W * 0.36, clearH * 0.85, -L * 0.22);
      cameraRef.current.position.set(-W * 0.85, clearH * 1.45, -L * 0.75);
      controlsRef.current.update();
      return;
    }

    controlsRef.current.target.set(0, targetY, 0);

    if (preset === 'iso') {
      cameraRef.current.position.set(maxDim * 1.05, maxDim * 0.75 + targetY, maxDim * 1.15);
    } else if (preset === 'front') {
      cameraRef.current.position.set(0, targetY + maxDim * 0.25, maxDim * 1.35);
    } else if (preset === 'side') {
      cameraRef.current.position.set(maxDim * 1.35, targetY + maxDim * 0.22, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, maxDim * 1.65 + targetY, 0.01);
    }
    controlsRef.current.update();
  };

  const handleCaptureImage = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3D案場模擬_${productType}_${W}x${L}m_${totalCapacityKW.toFixed(1)}kWp.png`;
    a.click();
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-900 rounded-b-xl overflow-hidden flex flex-col">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-slate-700/80 pointer-events-auto text-xs shadow-lg">
          <span className="text-slate-300 font-semibold mr-1 flex items-center gap-1">
            <Eye size={14} className="text-sky-400" /> 視角：
          </span>
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium cursor-pointer"
          >
            3D 透視
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium cursor-pointer"
          >
            南向正視
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium cursor-pointer"
          >
            山牆剖面
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium cursor-pointer"
          >
            俯視平面
          </button>
          {productType === 'sport_court' && (
            <button
              type="button"
              onClick={() => setCameraPreset('ladder')}
              className="px-2.5 py-1 rounded bg-amber-500/90 hover:bg-amber-400 text-slate-950 transition-colors font-extrabold cursor-pointer"
            >
              🪜 爬梯與走道特寫
            </button>
          )}
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            title="重置視角"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-slate-700/80 pointer-events-auto text-xs shadow-lg">
          <button
            type="button"
            onClick={() => setShowStructure(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium cursor-pointer ${
              showStructure ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers size={13} /> Tekla 鋼構與平台
          </button>
          {productType === 'sport_court' && (
            <button
              type="button"
              onClick={() => setShowMepAndRoof(v => !v)}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium cursor-pointer ${
                showMepAndRoof ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Zap size={13} /> 浪板/母索/機電表箱
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowEnvironment(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium cursor-pointer ${
              showEnvironment ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            場域環境
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium cursor-pointer ${
              autoRotate ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {autoRotate ? <Pause size={13} /> : <Play size={13} />} 環繞展示
          </button>
          <button
            type="button"
            onClick={handleCaptureImage}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors font-medium ml-1 cursor-pointer"
          >
            <Camera size={13} /> 匯出3D截圖
          </button>
        </div>
      </div>

      {/* Bottom Floating Info Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-xs">
        <div className="bg-slate-900/75 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700/70">
          操作提示：滑鼠<strong>左鍵拖曳</strong>旋轉視角 · <strong>右鍵拖曳</strong>平移 · <strong>滾輪</strong>縮放
          {productType === 'sport_court' && (
            <span className="ml-2 text-amber-300 font-bold">
              （已套用嵵裡國小母版：22m無中柱雙坡大梁+H10斜隅+14座防撞墊+4.5m設備平台+護籠爬梯+CT表箱）
            </span>
          )}
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-lg border border-slate-700/70 flex items-center gap-3 font-medium">
          <span>場域：{W}m × {L}m</span>
          <span className="text-slate-400">|</span>
          <span className="text-sky-400">模組：{totalPanels} 片</span>
          <span className="text-slate-400">|</span>
          <span className="text-amber-400 font-bold">總容量：{totalCapacityKW.toFixed(2)} kWp</span>
        </div>
      </div>

      {/* Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full flex-1 min-h-[480px] cursor-grab active:cursor-grabbing" />
    </div>
  );
}
