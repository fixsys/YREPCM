import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, Camera, Eye, Play, Pause, Layers } from 'lucide-react';

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
  const [showEnvironment, setShowEnvironment] = useState(true);

  const W = Math.max(2, Number(siteWidth) || 20);
  const L = Math.max(2, Number(siteLength) || 15);
  const tiltRad = (Math.max(0, Math.min(45, Number(tiltAngle) || 10)) * Math.PI) / 180;
  const clearH = Math.max(0.2, Number(dripHeight) || 3);
  const bldgH = Math.max(3, Number(buildingHeight) || 7);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf2f8);
    scene.fog = new THREE.FogExp2(0xeaf2f8, 0.0025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    const maxDim = Math.max(W, L);
    camera.position.set(maxDim * 1.15, maxDim * 0.85, maxDim * 1.25);
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
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 3;
    controls.maxDistance = 800;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.45);
    hemiLight.position.set(0, 80, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
    dirLight.position.set(60, 90, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 350;
    const d = 80;
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
      controlsRef.current.autoRotateSpeed = 1.5;
    }
  }, [autoRotate]);

  // Rebuild 3D geometry whenever parameters or layout change
  useEffect(() => {
    const group = contentGroupRef.current;
    if (!group) return;

    // Clear previous meshes
    while (group.children.length > 0) {
      const child = group.children[0] as any;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const cw = Math.min(cutoutWidth, W);
    const cl = Math.min(cutoutLength, L);

    // Helper: check if a 2D point (0..W, 0..L) is inside the site footprint
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

    // Helper: create footprintExtrudeGeometry in XZ plane (centered at 0,0)
    // Mapping: 2D (x: 0..W, y: 0..L) -> 3D (x: x - W/2, z: y - L/2)
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

    // Compute roof height function: given 2D y (0 = North/Back, L = South/Front)
    // Wait: let's make z = y - L/2 where y = L is South (front, lower eave) and y = 0 is North (back, higher ridge)
    const isRoofProduct = productType === 'roof_canopy' || productType === 'roof_flush';
    const baseElevation = isRoofProduct ? bldgH : 0;

    // Effective roof slope type per product
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
        // Ridge at y2d = L / 2
        const distFromEdge = Math.min(y2d, L - y2d);
        return eaveY + distFromEdge * Math.tan(tiltRad);
      } else {
        // Single slope: front (y2d = L) is lower eave, back (y2d = 0) is higher
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
        // ① 魚電共生室外型：戶外養殖池 + 池岸土堤 + 水車增氧機
        const bankOuter = buildExtrudedSlab(0.7, 0, 0x94a3b8, -0.6);
        group.add(bankOuter);

        const waterSlab = buildExtrudedSlab(0.55, 0.02, 0x0284c7, 0.3, 0.82);
        group.add(waterSlab);

        // Aerators (水車增氧機) inside pond
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
        // ② 魚電共生室內型：室內溫室/養殖棚 + 半透明圍牆 + 捲門 + 室內養殖池與藍色養殖桶
        const floorSlab = buildExtrudedSlab(0.3, 0, 0xcbd5e1, 0);
        group.add(floorSlab);

        // Indoor water pool on left half + circular blue breeding tanks on right half
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

        // Translucent greenhouse walls + rolling door
        const wallMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          transparent: true,
          opacity: 0.42,
          roughness: 0.2,
          side: THREE.DoubleSide,
        });
        const wallH = clearH;
        // Front & Back walls
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, wallH), wallMat);
        frontWall.position.set(0, wallH / 2, L / 2);
        const backWall = frontWall.clone();
        backWall.position.set(0, wallH / 2, -L / 2);
        // Left & Right walls
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(L, wallH), wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-W / 2, wallH / 2, 0);
        const rightWall = leftWall.clone();
        rightWall.position.set(W / 2, wallH / 2, 0);
        group.add(frontWall, backWall, leftWall, rightWall);

        // Gable triangular wall ends (left & right)
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

        // Rolling shutter door on right/front
        const doorW = Math.min(3.5, W * 0.25);
        const doorH = Math.min(3.2, wallH * 0.85);
        const doorMesh = new THREE.Mesh(
          new THREE.BoxGeometry(doorW, doorH, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.4 })
        );
        doorMesh.position.set(W / 2 - doorW * 0.8, doorH / 2, L / 2 + 0.02);
        group.add(doorMesh);
      } else if (productType === 'sport_court') {
        // ③ 風雨球場：運動球場 (藍紅雙色籃球場 + 白色球線 + 籃球架 + 圍網)
        const outerApron = buildExtrudedSlab(0.15, 0, 0x16a34a, -0.8);
        group.add(outerApron);
        const mainCourt = buildExtrudedSlab(0.18, 0.01, 0x1d4ed8, 0.2);
        group.add(mainCourt);

        // Court markings & key areas
        const cwCourt = Math.max(4, W * 0.78);
        const clCourt = Math.max(4, L * 0.78);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });

        // Center circle & paint areas
        const centerCircle = new THREE.Mesh(new THREE.RingGeometry(Math.min(cwCourt, clCourt) * 0.11, Math.min(cwCourt, clCourt) * 0.12, 32), lineMat);
        centerCircle.rotation.x = -Math.PI / 2;
        centerCircle.position.set(0, 0.21, 0);
        const centerFill = new THREE.Mesh(new THREE.CircleGeometry(Math.min(cwCourt, clCourt) * 0.11, 32), redMat);
        centerFill.rotation.x = -Math.PI / 2;
        centerFill.position.set(0, 0.205, 0);
        group.add(centerCircle, centerFill);

        // Border lines
        const borderRing = new THREE.Mesh(new THREE.PlaneGeometry(cwCourt, clCourt), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }));
        borderRing.rotation.x = -Math.PI / 2;
        borderRing.position.set(0, 0.195, 0);
        group.add(borderRing);

        // Red key zones at left/right or front/back along longer axis
        const alongX = W >= L;
        const keyLen = (alongX ? cwCourt : clCourt) * 0.22;
        const keyWid = (alongX ? clCourt : cwCourt) * 0.32;
        const key1 = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? keyLen : keyWid, alongX ? keyWid : keyLen), redMat);
        key1.rotation.x = -Math.PI / 2;
        key1.position.set(
          alongX ? -cwCourt / 2 + keyLen / 2 : 0,
          0.205,
          alongX ? 0 : -clCourt / 2 + keyLen / 2
        );
        const key2 = key1.clone();
        key2.position.set(
          alongX ? cwCourt / 2 - keyLen / 2 : 0,
          0.205,
          alongX ? 0 : clCourt / 2 - keyLen / 2
        );
        group.add(key1, key2);

        // Basketball hoops at both ends
        const buildHoop = (x: number, z: number, rotY: number) => {
          const hg = new THREE.Group();
          hg.position.set(x, 0.2, z);
          hg.rotation.y = rotY;
          const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.3 });
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 12), postMat);
          post.position.set(0, 1.6, 0);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.1), postMat);
          arm.position.set(0, 3.05, 0.5);
          const board = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 1.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
          );
          board.position.set(0, 3.05, 1.05);
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.23, 0.025, 8, 20),
            new THREE.MeshStandardMaterial({ color: 0xea580c })
          );
          rim.rotation.x = Math.PI / 2;
          rim.position.set(0, 2.8, 1.32);
          hg.add(post, arm, board, rim);
          return hg;
        };
        if (alongX) {
          group.add(buildHoop(-cwCourt / 2, 0, Math.PI / 2));
          group.add(buildHoop(cwCourt / 2, 0, -Math.PI / 2));
        } else {
          group.add(buildHoop(0, -clCourt / 2, 0));
          group.add(buildHoop(0, clCourt / 2, Math.PI));
        }
      } else if (productType === 'roof_canopy') {
        // ④ 屋頂棚架型：RC平屋頂大樓/廠房 + 女兒牆 + 屋頂水泥基座墩
        const buildingMesh = buildExtrudedSlab(bldgH, 0, 0xd6d3d1, 0);
        group.add(buildingMesh);

        // Roof waterproof surface (grayish green/slate)
        const roofTopMesh = buildExtrudedSlab(0.08, bldgH, 0x94a3b8, 0.25);
        group.add(roofTopMesh);

        // Parapet walls (女兒牆) around perimeter
        const parapetOuter = buildExtrudedSlab(0.9, bldgH, 0xe7e5e4, 0);
        group.add(parapetOuter);
      } else if (productType === 'roof_flush') {
        // ⑤ 屋頂平鋪型：斜屋頂鐵皮廠房 (沿斜屋面鋪設模組)
        // Build factory walls + sloped roof body matching getCanopySurfaceY
        const wallH = bldgH;
        const factoryBase = buildExtrudedSlab(wallH, 0, 0xcbd5e1, 0);
        group.add(factoryBase);

        // Sloped metal roof deck under the panels
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
        // ⑥ 地面型：碎石基地 + 草地邊界
        const gravelPad = buildExtrudedSlab(0.12, 0, 0x9ca3af, -0.3);
        group.add(gravelPad);
      }
    }

    // =========================================================================
    // 2. STEEL STRUCTURE / RACKING SYSTEM (鋼構棚架 / 支架與水泥基座)
    // =========================================================================
    if (showStructure) {
      const steelColor =
        productType === 'sport_court'
          ? 0x334155
          : productType === 'roof_flush'
          ? 0x94a3b8
          : 0x64748b;
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
        // ⑤ 屋頂平鋪型：沿屋面鋁擠導軌
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
        // ⑥ 地面型 (分排獨立支架)：依據有效面板的每一列 (y座標分組) 建立前後立柱、水泥基礎墩與斜樑
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

          // Concrete piers + front/back posts every ~3.5m
          const postStep = Math.max(2.5, (maxX - minX) / Math.max(1, Math.ceil((maxX - minX) / 3.5)));
          for (let px = minX + 0.3; px <= maxX - 0.1; px += postStep) {
            const x3d = px - W / 2;
            // Front pier & post
            const pierF = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), pierMat);
            pierF.position.set(x3d, 0.15, zFront);
            const postF = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, lowH, 8), steelMat);
            postF.position.set(x3d, lowH / 2, zFront);

            // Back pier & post
            const pierB = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), pierMat);
            pierB.position.set(x3d, 0.15, zBack);
            const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, highH, 8), steelMat);
            postB.position.set(x3d, highH / 2, zBack);

            // Rafter connecting front & back post
            const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, ph * 0.95), steelMat);
            rafter.position.set(x3d, (lowH + highH) / 2 - 0.04, y0 + ph / 2 - L / 2);
            rafter.rotation.x = tiltRad;

            group.add(pierF, postF, pierB, postB, rafter);
          }

          // Longitudinal purlins along the row
          const rowSpan = maxX - minX;
          const purlin1 = new THREE.Mesh(new THREE.BoxGeometry(rowSpan, 0.06, 0.06), steelMat);
          purlin1.position.set((minX + maxX) / 2 - W / 2, lowH + (highH - lowH) * 0.25, zFront);
          const purlin2 = new THREE.Mesh(new THREE.BoxGeometry(rowSpan, 0.06, 0.06), steelMat);
          purlin2.position.set((minX + maxX) / 2 - W / 2, lowH + (highH - lowH) * 0.75, zBack);
          group.add(purlin1, purlin2);
        });
      } else {
        // ① 魚電室外、② 魚電室內、③ 風雨球場、④ 屋頂棚架、⑥ 地面型(連續棚架)
        // Full canopy columns, concrete piers, sloped rafters, and purlins
        const numColsX = Math.max(2, Math.round(W / 6) + 1);
        const numColsZ = Math.max(2, Math.round(L / 6) + 1);
        const colSpacingX = (W - 1.2) / (numColsX - 1);
        const colSpacingZ = (L - 1.2) / (numColsZ - 1);
        const colW = productType === 'sport_court' || productType === 'fish_outdoor' ? 0.24 : 0.18;
        const pierH = productType === 'fish_outdoor' ? 1.1 : productType === 'roof_canopy' ? 0.65 : 0.45;

        // Columns + concrete piers
        for (let ix = 0; ix < numColsX; ix++) {
          const x2d = 0.6 + ix * colSpacingX;
          const x3d = x2d - W / 2;

          for (let iz = 0; iz < numColsZ; iz++) {
            // For indoor fish or sport court, keep interior clearer or place along frames
            const isBoundaryZ = iz === 0 || iz === numColsZ - 1;
            const isMidRidgeZ = effectiveSlope === 'gable' && iz === Math.floor(numColsZ / 2);
            if ((productType === 'sport_court' || productType === 'fish_indoor') && !isBoundaryZ && !isMidRidgeZ) {
              continue;
            }

            const y2d = 0.6 + iz * colSpacingZ;
            if (!isInsideFootprint(x2d, y2d)) continue;

            const topY = getCanopySurfaceY(y2d) - 0.12;
            const colHeight = Math.max(0.5, topY - baseElevation);
            const z3d = y2d - L / 2;

            // Concrete pier
            const pier = new THREE.Mesh(new THREE.BoxGeometry(colW * 2.2, pierH, colW * 2.2), pierMat);
            pier.position.set(x3d, baseElevation + pierH / 2, z3d);
            pier.castShadow = true;
            group.add(pier);

            // H-beam column
            const colMesh = new THREE.Mesh(new THREE.BoxGeometry(colW, colHeight, colW), steelMat);
            colMesh.position.set(x3d, baseElevation + colHeight / 2, z3d);
            colMesh.castShadow = true;
            group.add(colMesh);
          }

          // Sloped Rafters (斜樑) along Z for each X column frame
          if (effectiveSlope === 'gable') {
            const halfL = (L - 0.8) / 2;
            const hyp = halfL / Math.cos(tiltRad);
            // Front half rafter (y2d: L/2 -> L)
            const yMidF = L * 0.75;
            if (isInsideFootprint(x2d, yMidF)) {
              const rafF = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.22, hyp), steelMat);
              rafF.position.set(x3d, getCanopySurfaceY(yMidF) - 0.12, yMidF - L / 2);
              rafF.rotation.x = tiltRad;
              group.add(rafF);
            }
            // Back half rafter (y2d: 0 -> L/2)
            const yMidB = L * 0.25;
            if (isInsideFootprint(x2d, yMidB)) {
              const rafB = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.22, hyp), steelMat);
              rafB.position.set(x3d, getCanopySurfaceY(yMidB) - 0.12, yMidB - L / 2);
              rafB.rotation.x = -tiltRad;
              group.add(rafB);
            }
            // Horizontal tie beam for gable truss
            if (isInsideFootprint(x2d, L * 0.5)) {
              const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.6, 0.14, L - 1.2), steelMat);
              tieBeam.position.set(x3d, baseElevation + clearH, 0);
              group.add(tieBeam);
            }
          } else {
            // Single slope rafter
            const hyp = (L - 0.8) / Math.cos(tiltRad);
            const yMid = L * 0.5;
            if (isInsideFootprint(x2d, yMid)) {
              const raf = new THREE.Mesh(new THREE.BoxGeometry(colW * 0.85, 0.22, hyp), steelMat);
              raf.position.set(x3d, getCanopySurfaceY(yMid) - 0.12, 0);
              raf.rotation.x = tiltRad;
              group.add(raf);
            }
          }
        }

        // Longitudinal purlins (橫向檁條) along X
        const purlinCount = Math.max(4, Math.round(L / 2.2));
        for (let ip = 0; ip <= purlinCount; ip++) {
          const y2d = 0.5 + (ip / purlinCount) * (L - 1.0);
          // Determine valid X segments at this y2d
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

    // =========================================================================
    // 3. SOLAR MODULES (3D 太陽能模組陣列 — 與 2D 排佈完全同步)
    // =========================================================================
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.7,
      roughness: 0.25,
    });
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.45,
      roughness: 0.2,
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

      let y3d = getCanopySurfaceY(centerY2D) + 0.04;
      let panelTilt = getCanopyTiltSigned(centerY2D);

      if (productType === 'ground_mount' && groundMountStyle === 'rows') {
        // Each row tilts individually around its front/center
        const lowH = clearH;
        const highH = clearH + panel.h * Math.sin(tiltRad);
        y3d = (lowH + highH) / 2 + 0.04;
        panelTilt = tiltRad;
      }

      const pg = new THREE.Group();
      pg.position.set(x3d, y3d, z3d);
      pg.rotation.x = panelTilt;

      // Aluminum frame
      const frameGeo = new THREE.BoxGeometry(panel.w, 0.045, panel.h);
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      pg.add(frameMesh);

      // Deep-blue PV cell surface
      const cellGeo = new THREE.BoxGeometry(Math.max(0.05, panel.w - 0.05), 0.052, Math.max(0.05, panel.h - 0.05));
      const cellMesh = new THREE.Mesh(cellGeo, cellMat);
      pg.add(cellMesh);

      // Subtle silver busbar lines on top of module
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
    showEnvironment,
  ]);

  const setCameraPreset = (preset: 'iso' | 'front' | 'side' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const maxDim = Math.max(W, L);
    const targetY = productType === 'roof_canopy' || productType === 'roof_flush' ? bldgH * 0.7 : 2;
    controlsRef.current.target.set(0, targetY, 0);

    if (preset === 'iso') {
      cameraRef.current.position.set(maxDim * 1.15, maxDim * 0.85 + targetY, maxDim * 1.25);
    } else if (preset === 'front') {
      cameraRef.current.position.set(0, targetY + maxDim * 0.35, maxDim * 1.45);
    } else if (preset === 'side') {
      cameraRef.current.position.set(maxDim * 1.45, targetY + maxDim * 0.3, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, maxDim * 1.7 + targetY, 0.01);
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
    <div className="relative w-full h-full min-h-[460px] bg-slate-900 rounded-b-xl overflow-hidden flex flex-col">
      {/* Top Floating Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-slate-700/80 pointer-events-auto text-xs shadow-lg">
          <span className="text-slate-300 font-semibold mr-1 flex items-center gap-1">
            <Eye size={14} className="text-sky-400" /> 視角：
          </span>
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium"
          >
            3D 透視
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium"
          >
            南向正視
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium"
          >
            剖面側視
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 rounded hover:bg-slate-700 transition-colors font-medium"
          >
            俯視平面
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('iso')}
            title="重置視角"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-slate-700/80 pointer-events-auto text-xs shadow-lg">
          <button
            type="button"
            onClick={() => setShowStructure(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium ${
              showStructure ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers size={13} /> 鋼構支架
          </button>
          <button
            type="button"
            onClick={() => setShowEnvironment(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium ${
              showEnvironment ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            場域環境
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(v => !v)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors font-medium ${
              autoRotate ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {autoRotate ? <Pause size={13} /> : <Play size={13} />} 環繞展示
          </button>
          <button
            type="button"
            onClick={handleCaptureImage}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors font-medium ml-1"
          >
            <Camera size={13} /> 匯出3D截圖
          </button>
        </div>
      </div>

      {/* Bottom Floating Info Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-xs">
        <div className="bg-slate-900/75 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700/70">
          操作提示：滑鼠<strong>左鍵拖曳</strong>旋轉視角 · <strong>右鍵拖曳</strong>平移 · <strong>滾輪</strong>縮放
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
      <div ref={mountRef} className="w-full flex-1 min-h-[460px] cursor-grab active:cursor-grabbing" />
    </div>
  );
}
