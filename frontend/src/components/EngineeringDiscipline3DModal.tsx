import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, Eye, RotateCcw, Play, Pause, Layers, CheckCircle2, Box, Upload, FolderOpen } from 'lucide-react';

export type EngineeringDisciplineId = 'CIVIL' | 'STEEL' | 'MEP';

export interface DisciplineMeta {
  id: EngineeringDisciplineId;
  code: string;
  name: string;
  enName: string;
  badgeColor: string;
  borderColor: string;
  bgLight: string;
  textColor: string;
  summary: string;
  deliverables: string[];
  checkpoints: { title: string; spec: string; detail: string }[];
}

export const ENGINEERING_DISCIPLINES: DisciplineMeta[] = [
  {
    id: 'CIVIL',
    code: 'C',
    name: '土木與基礎工程',
    enName: 'Civil & Foundation Engineering',
    badgeColor: 'from-amber-600 to-stone-800',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50/70',
    textColor: 'text-amber-900',
    summary:
      '涵蓋現場收方測量、地下管溝/暗溝套繪、800×700mm 縱向連續基礎地梁、柱墩鋼筋籠配筋 (8-#6 主筋 + #4@15 箍筋)、8-M20×170L 化學錨栓、拉拔試驗、甲種安全圍籬與地坪漆面復原。',
    deliverables: [
      '現場收方及柱位退縮圖 (.dwg)',
      '基礎開挖與縱向連續地梁配筋圖 (.dwg / .pdf)',
      '柱底板植筋化學錨栓詳圖 (8-M20×170L)',
      '工程預算書 - 肆、土木工程分項母版 (.xlsx)',
    ],
    checkpoints: [
      {
        title: '1. 縱向連續地梁基礎 (800 × 700 mm)',
        spec: '開挖深 -800mm (GL-100 ~ -800mm) + 柱墩凸出至 GL+0',
        detail: '外島高風壓或球場抗拔需求高時，採用 800×700mm 連續地梁串聯同軸 7 支鋼柱基礎，主筋 8-#6、箍筋 #4@15cm。',
      },
      {
        title: '2. 柱底板 D1/D2 與 8-M20 化學錨栓',
        spec: '底板 PL20×500×500 + 加勁板 PL8×100×8片 + 8-M20×170L',
        detail: '柱底板下方灌注無收縮水泥砂漿，柱外包覆 200cm 高鮮黃色防撞護墊（全場 14 座），確保運動安全。',
      },
      {
        title: '3. 地下暗溝與既有管網退縮檢核',
        spec: '柱中心距離既有排水暗溝邊緣 ≥ 1.2m',
        detail: '先期收方務必標示球場四周排水暗溝、化糞池與給排水管，一次定案跨距（如 22.0m 對稱跨距），避免開挖後改圖。',
      },
    ],
  },
  {
    id: 'STEEL',
    code: 'S',
    name: '鋼構與支架工程',
    enName: 'Steel Structure, Tekla & Racking',
    badgeColor: 'from-blue-600 to-indigo-900',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50/70',
    textColor: 'text-blue-900',
    summary:
      '涵蓋 Midas 3D 結構計算書、結構技師簽證圖、Tekla 鋼構拆料總圖、一次/二次/板加工圖、梁柱斜隅加腋 (H10)、+4.5m 設備平台與 BR1 斜撐、屋面 C150×50 檁條、0.6mm 清浪板、40×40 鋁擠支架 (浪板 h 腳座 / 屋脊 L 腳座)、護籠爬梯、L 型菱形網走道與四周 1m 安全母索圍籬。',
    deliverables: [
      '結構簽證圖與 Midas 3D 結構計算書 (.dwg / .pdf)',
      'Tekla 鋼構拆料總圖、一次加工圖、二次加工圖、板加工圖 (.dwg / .pdf)',
      '+4.5m 設備平台結構與 BR1 斜撐補強詳圖 (.dwg)',
      '鋁擠支架安裝詳圖與分料單 (屋脊換 L 腳座範例) (.pdf)',
      '安全母索立柱 (1m高+50cm斜撐) 與 L 型維修走道詳圖 (.pdf)',
    ],
    checkpoints: [
      {
        title: '1. 22m 無中柱大跨距雙坡大梁 + 斜隅加腋 (H10)',
        spec: '主柱 SC1~7 (RH300×300) + 大梁 SG1~6 (RH400×200) + H10 加腋',
        detail: '大梁於屋脊中央 (軸 3) 以 PL19×380×682 端板及 24-M20 高張力螺栓對接；柱頭下方設 2m 長斜隅加腋抵抗負彎矩。',
      },
      {
        title: '2. 浪板 h 型腳座 vs 屋脊中脊板 L 型腳座',
        spec: '一般浪板波峰採 h 腳座 (1125只)｜屋脊平板區必換 L 腳座 (90只)',
        detail: '屋脊中脊蓋板為平板構造，無法跨坐 h 型腳座，分料單第一排務必切換為 L 型腳座 + EPDM 防水墊片。',
      },
      {
        title: '3. 護籠爬梯 (軸1/G)、L 型雙走道與四周封閉母索圍籬',
        spec: '西南角 G 軸山牆爬梯 + L 型走道 (60.8m) + 四周母索立柱 (115.8m)',
        detail: '爬梯自 G 軸南端山牆直上南端橫向走道並連通軸 3 屋脊主走道（與模組零重疊）；屋面四邊每 2.5m 設 1m 高角鐵立柱（附 50cm 內向斜撐）。',
      },
    ],
  },
  {
    id: 'MEP',
    code: 'E',
    name: '機電與台電併網工程',
    enName: 'MEP, String Layout & Taipower Grid',
    badgeColor: 'from-purple-600 to-fuchsia-900',
    borderColor: 'border-purple-300',
    bgLight: 'bg-purple-50/70',
    textColor: 'text-purple-900',
    summary:
      '涵蓋台電送審圖、機電施工圖、單線圖 (E11/E21)、17 串 DC 串併與遮陰區獨立短串 MPPT、新望變流器 (110kW + 30kW)、#A/#B (100×100mm) 鋁線槽填充率檢討 (<20%)、#C/#D (Ø82mm RSG) 金屬管幹線、1F 3Φ4W 附 CT 雙門不鏽鋼電表箱 (1350×2150mm) 與 E22/E30 接地系統。',
    deliverables: [
      '台電送審圖與審訖圖 (.dwg / .pdf)',
      '機電施工圖 (昇位圖 E11、單線圖 E21、串併圖、線槽與接地配置圖) (.dwg / .pdf)',
      '3Φ4W 低壓附 CT 雙門使用式電錶箱結構圖 (寬 1350×高 2150mm) (.pdf)',
      '串併及線槽填充率檢討表 (.xlsx)',
    ],
    checkpoints: [
      {
        title: '1. 遮陰區短串獨立 MPPT 分離設計',
        spec: '無遮陰主串 16~18 串｜鄰近校舍 2F 遮陰區獨立 11~12 短串 MPPT',
        detail: '受早晚建物遮陰之模組嚴禁與高日照長串並聯，必須獨立接入專用 MPPT，避免拉低整組變流器發電效率。',
      },
      {
        title: '2. #A / #B 100×100mm 鋁線槽填充率 < 20%',
        spec: '#A DC 主線槽填充率 15.96%｜#B AC 分路線槽填充率 12.66%',
        detail: '#A 沿屋脊中央收集 17 串 PV Cable 4.0mm² (34條) + E22 接地線，於北端軸 A 轉折沿軸 5/A 鋼柱下引至 +4.5m 設備平台。',
      },
      {
        title: '3. 1F 3Φ4W 附 CT 雙門電表箱與 #C/#D 幹線管',
        spec: 'SUS304 2.0t (寬 1350 × 高 2150 × 深 500mm)，離地 1.5~1.8m，內門淨寬 ≥ 55cm',
        detail: '由平台 AC-1 經 2 支 Ø82mm (3") RSG 金屬管 (#C 進 KWH-PV 表箱、#D 進受電箱) 下地埋設至責任分界點，並設 E22 (<10Ω) 與 E30 (<50Ω) 接地銅棒。',
      },
    ],
  },
];

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
    ? new THREE.CylinderGeometry(width / 2, width / 2, len, 12)
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

  const webMesh = new THREE.Mesh(new THREE.BoxGeometry(tw, H - 2 * tf, len), material);
  const flGeo = new THREE.BoxGeometry(B, tf, len);
  const topFl = new THREE.Mesh(flGeo, material);
  topFl.position.y = (H - tf) / 2;
  const botFl = new THREE.Mesh(flGeo, material);
  botFl.position.y = -(H - tf) / 2;

  webMesh.castShadow = true;
  topFl.castShadow = true;
  botFl.castShadow = true;
  grp.add(webMesh, topFl, botFl);
  return grp;
}

interface Props {
  initialDiscipline: EngineeringDisciplineId;
  onClose: () => void;
  onOpenUploadModal?: (discipline: EngineeringDisciplineId) => void;
  onFilterFilesByDiscipline?: (discipline: EngineeringDisciplineId) => void;
}

export default function EngineeringDiscipline3DModal({
  initialDiscipline,
  onClose,
  onOpenUploadModal,
  onFilterFilesByDiscipline,
}: Props) {
  const [activeDiscipline, setActiveDiscipline] = useState<EngineeringDisciplineId>(initialDiscipline);
  const [autoRotate, setAutoRotate] = useState(true);
  const [xrayMode, setXrayMode] = useState(true); // 透視混凝土看鋼筋籠 / 透視浪板看鋼構與線槽
  const [explodedView, setExplodedView] = useState(false); // 垂直分層爆炸演示

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animRef = useRef<number>(0);

  const currentMeta =
    ENGINEERING_DISCIPLINES.find(d => d.id === activeDiscipline) || ENGINEERING_DISCIPLINES[0];

  // Initialize Three.js Canvas
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 1000);
    camera.position.set(14, 10, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 2.5, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.55);
    hemi.position.set(0, 40, 0);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    dirLight.position.set(25, 35, 25);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(32, 32, 0x334155, 0x1e293b);
    grid.position.y = -0.02;
    scene.add(grid);

    const contentGroup = new THREE.Group();
    scene.add(contentGroup);
    groupRef.current = contentGroup;

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const cw = mountRef.current.clientWidth;
      const ch = mountRef.current.clientHeight;
      cameraRef.current.aspect = cw / ch;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(cw, ch);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Build discipline-specific 3D engineering demonstration
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0] as any;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const expOffset = explodedView ? 1.8 : 0;

    if (activeDiscipline === 'CIVIL') {
      // =======================================================================
      // 🧱 1. 土木與基礎工程 3D 演示：
      //    - 800×700mm 縱向連續基礎地梁 (半透明混凝土可透視內部 8-#6 主筋與 #4@15 箍筋籠)
      //    - 柱墩 + 無收縮水泥層 + PL20×500×500 柱底板 (D1) + 8 片加勁板 (D2) + 8-M20×170L 化學錨栓
      //    - RH300×300 主鋼柱下段 + 2.0m 高鮮黃色防撞護墊
      //    - 球場地坪與旁邊地下排水暗溝安全退縮距離示意
      // =======================================================================
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.target.set(0, 1.5, 0);
        cameraRef.current.position.set(8.5, 6.2, 9.5);
        controlsRef.current.update();
      }

      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.75,
        transparent: xrayMode,
        opacity: xrayMode ? 0.38 : 0.96,
      });
      const mainRebarMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // 8-#6 縱向主筋 (亮青藍色標示)
        metalness: 0.6,
        roughness: 0.3,
      });
      const stirrupMat = new THREE.MeshStandardMaterial({
        color: 0xef4444, // #4@15 箍筋 (醒目紅色標示)
        metalness: 0.5,
        roughness: 0.35,
      });
      const anchorBoltMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15, // 8-M20×170L 化學錨栓 (亮金色)
        metalness: 0.75,
        roughness: 0.2,
      });
      const steelPlateMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.7,
        roughness: 0.28,
      });
      const safetyPadMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.45,
        transparent: true,
        opacity: xrayMode ? 0.45 : 0.95,
      });

      const beamLen = 9.0; // 演示 2 跨段 (含 2 座柱墩)
      const beamW = 0.8; // 800mm 寬
      const beamH = 0.7; // 700mm 深

      // (a) 地下開挖槽與碎石級配底層 (PC 墊層)
      const pcLayer = new THREE.Mesh(
        new THREE.BoxGeometry(beamLen + 0.6, 0.1, beamW + 0.4),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
      );
      pcLayer.position.set(0, -0.85, 0);
      group.add(pcLayer);

      // (b) 800×700mm 縱向連續地梁混凝土本體 (Z = -0.8m ~ -0.1m)
      const gradeBeam = new THREE.Mesh(new THREE.BoxGeometry(beamLen, beamH, beamW), concreteMat);
      gradeBeam.position.set(0, -0.45, 0);
      group.add(gradeBeam);

      // (c) 地梁內部鋼筋籠：8-#6 縱向主筋 (上下各3支+中段2支) + #4@15cm 矩形箍筋
      const rebarYList = [-0.73, -0.45, -0.17];
      const rebarZList = [-0.32, 0, 0.32];
      rebarYList.forEach((ry, yIdx) => {
        rebarZList.forEach((rz, zIdx) => {
          if (yIdx === 1 && zIdx === 1) return; // 共 8 支 #6 主筋
          const bar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.019, 0.019, beamLen - 0.16, 10),
            mainRebarMat
          );
          bar.rotation.z = Math.PI / 2;
          bar.position.set(0, ry, rz);
          group.add(bar);
        });
      });

      // #4@15cm 箍筋 (每 0.25m 繪製一圈矩形閉合箍筋)
      for (let sx = -beamLen / 2 + 0.2; sx <= beamLen / 2 - 0.2; sx += 0.25) {
        const wStir = 0.66;
        const hStir = 0.58;
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, wStir), stirrupMat);
        topBar.position.set(sx, -0.16, 0);
        const botBar = topBar.clone();
        botBar.position.set(sx, -0.74, 0);
        const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, hStir, 0.016), stirrupMat);
        leftBar.position.set(sx, -0.45, -wStir / 2);
        const rightBar = leftBar.clone();
        rightBar.position.set(sx, -0.45, wStir / 2);
        group.add(topBar, botBar, leftBar, rightBar);
      }

      // (d) 兩座柱位 (-2.5m 與 +2.5m)：柱墩 + 8-M20×170L 化學錨栓 + D1 底板 (PL20×500×500) + D2 加勁板 (8片) + RH300×300 鋼柱 + 防撞護墊
      for (const colX of [-2.5, 2.5]) {
        // 柱墩混凝土 (650×650×250mm, 凸出至 GL+0.15)
        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.68), concreteMat);
        pedestal.position.set(colX, 0.02, 0);
        group.add(pedestal);

        // 8-M20×170L 植化學錨栓 (含螺帽與華司)
        const boltCoords = [
          [-0.2, -0.2],
          [0, -0.2],
          [0.2, -0.2],
          [-0.2, 0],
          [0.2, 0],
          [-0.2, 0.2],
          [0, 0.2],
          [0.2, 0.2],
        ];
        boltCoords.forEach(([bx, bz]) => {
          const anchor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, 0.45, 10),
            anchorBoltMat
          );
          anchor.position.set(colX + bx, 0.1 + expOffset * 0.35, bz);
          const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6), anchorBoltMat);
          nut.position.set(colX + bx, 0.26 + expOffset * 0.5, bz);
          group.add(anchor, nut);
        });

        // 柱底板 D1 (PL20×500×500)
        const baseY = 0.2 + expOffset * 0.5;
        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.52), steelPlateMat);
        basePlate.position.set(colX, baseY, 0);
        group.add(basePlate);

        // 柱底 8 片加勁板 D2 (PL8×100×100)
        for (const sx of [-0.16, 0.16]) {
          for (const sz of [-0.1, 0.1]) {
            const stiff = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.14, 0.12), steelPlateMat);
            stiff.position.set(colX + sx, baseY + 0.085, sz);
            group.add(stiff);
          }
        }

        // 主鋼柱 SC (RH300×300×10×15)
        const colBotY = baseY + 0.02 + expOffset * 0.3;
        const colTopY = colBotY + 3.4;
        group.add(
          createHBeamBetween(
            new THREE.Vector3(colX, colBotY, 0),
            new THREE.Vector3(colX, colTopY, 0),
            0.3,
            0.3,
            0.02,
            0.03,
            steelPlateMat
          )
        );

        // 鋼柱防撞護墊 (高 2.0m 鮮黃色包覆)
        const padMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.0, 0.48), safetyPadMat);
        padMesh.position.set(colX, colBotY + 1.0 + expOffset * 0.3, 0);
        group.add(padMesh);
      }

      // (e) 球場側地坪與外側既有地下排水暗溝 (示意柱位避開暗溝退縮)
      const courtFloor = new THREE.Mesh(
        new THREE.BoxGeometry(beamLen, 0.08, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 })
      );
      courtFloor.position.set(0, -0.02, -2.1);
      group.add(courtFloor);

      // 既有排水暗溝 (位於外側 Z = +1.6m，附藍色水流與水溝蓋格柵)
      const culvertOuter = new THREE.Mesh(
        new THREE.BoxGeometry(beamLen, 0.65, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
      );
      culvertOuter.position.set(0, -0.35, 1.65);
      const culvertWater = new THREE.Mesh(
        new THREE.BoxGeometry(beamLen - 0.1, 0.25, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 })
      );
      culvertWater.position.set(0, -0.45, 1.65);
      group.add(culvertOuter, culvertWater);
    } else if (activeDiscipline === 'STEEL') {
      // =======================================================================
      // 🏗️ 2. 鋼構與支架工程 3D 演示：
      //    - 雙柱無中柱門型剛架 (SC 鋼柱 + SG 雙坡大梁 + H10 斜隅加腋 + 屋脊端板高張力螺栓對接)
      //    - +4.5m 懸挑設備平台 (RH150×75 + BR1 雙斜撐 + 花紋鋼板 + 護欄)
      //    - 屋面 C150×50 檁條 + 交叉風拉桿 (BK1/BK2) + 半透明 0.6mm 清浪板
      //    - 40×40 側開鋁擠支架：浪板波峰「h 型腳座」 vs 屋脊中脊板「橘色 L 型腳座」特寫
      //    - 西南角護籠爬梯 + L 型菱形網維修走道 + 屋面四周 1m 安全母索立柱 (含 50cm 內向斜撐)
      // =======================================================================
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.target.set(0, 4.2, 0);
        cameraRef.current.position.set(13.5, 9.5, 15.0);
        controlsRef.current.update();
      }

      const steelPrimaryMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.6,
        roughness: 0.3,
      });
      const steelSecMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.55,
        roughness: 0.35,
      });
      const haunchMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // 醒目亮橘色標示 H10 斜隅加腋與屋脊對接端板
        metalness: 0.6,
        roughness: 0.3,
      });
      const purlinMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.5,
        roughness: 0.35,
      });
      const lFootMat = new THREE.MeshStandardMaterial({
        color: 0xf97316, // 屋脊 L 腳座 (醒目橘紅色標示)
        metalness: 0.6,
        roughness: 0.25,
      });
      const hFootMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e, // 浪板 h 腳座 (醒目亮綠色標示)
        metalness: 0.6,
        roughness: 0.25,
      });

      const spanZ = 12.0; // 比例縮放展示 2 榀完整門型剛架
      const bayX = 5.5;
      const eaveH = 5.2;
      const ridgeH = 6.3;

      const getRoofY = (z: number) => {
        const dz = Math.abs(z);
        return ridgeH - (dz / (spanZ / 2)) * (ridgeH - eaveH);
      };

      for (const fx of [-bayX / 2, bayX / 2]) {
        // 左右雙柱 SC (RH300×300)
        for (const fz of [-spanZ / 2, spanZ / 2]) {
          group.add(
            createHBeamBetween(
              new THREE.Vector3(fx, 0, fz),
              new THREE.Vector3(fx, eaveH, fz),
              0.32,
              0.3,
              0.025,
              0.035,
              steelPrimaryMat
            )
          );
        }

        // 雙坡大梁 SG (RH400×200)
        const pLeft = new THREE.Vector3(fx, eaveH, -spanZ / 2 - 0.6);
        const pRidge = new THREE.Vector3(fx, ridgeH, 0);
        const pRight = new THREE.Vector3(fx, eaveH, spanZ / 2 + 0.6);
        group.add(
          createHBeamBetween(pLeft, pRidge, 0.4, 0.2, 0.022, 0.032, steelPrimaryMat),
          createHBeamBetween(pRidge, pRight, 0.4, 0.2, 0.022, 0.032, steelPrimaryMat)
        );

        // 屋脊端板 PL19×380×682 對接 (亮橘色高亮)
        const splice = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.06), haunchMat);
        splice.position.set(fx, ridgeH - 0.08, 0);
        group.add(splice);

        // 兩端梁柱斜隅加腋 Haunch H10 (亮橘色高亮)
        group.add(
          createMemberBetween(
            new THREE.Vector3(fx, eaveH - 0.55, -spanZ / 2 + 0.1),
            new THREE.Vector3(fx, getRoofY(-spanZ / 2 + 1.8) - 0.2, -spanZ / 2 + 1.8),
            0.18,
            0.22,
            haunchMat
          ),
          createMemberBetween(
            new THREE.Vector3(fx, eaveH - 0.55, spanZ / 2 - 0.1),
            new THREE.Vector3(fx, getRoofY(spanZ / 2 - 1.8) - 0.2, spanZ / 2 - 1.8),
            0.18,
            0.22,
            haunchMat
          )
        );
      }

      // 縱向主繫梁 E1~E4、次梁 CP1~CP4 與 +4.2m 下層抗風縱梁
      for (const zTie of [-spanZ / 2, -spanZ / 4, 0, spanZ / 4, spanZ / 2]) {
        const ty = getRoofY(zTie) - 0.1;
        group.add(
          createHBeamBetween(
            new THREE.Vector3(-bayX / 2, ty, zTie),
            new THREE.Vector3(bayX / 2, ty, zTie),
            0.26,
            0.15,
            0.018,
            0.025,
            steelSecMat
          )
        );
      }
      for (const zCol of [-spanZ / 2, spanZ / 2]) {
        group.add(
          createHBeamBetween(
            new THREE.Vector3(-bayX / 2, eaveH * 0.78, zCol),
            new THREE.Vector3(bayX / 2, eaveH * 0.78, zCol),
            0.22,
            0.12,
            0.016,
            0.022,
            steelSecMat
          )
        );
      }

      // 屋面 X 型交叉風拉桿 BK1, BK2 (Ø16 圓鋼)
      const braceMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 });
      for (const [z1, z2] of [
        [-spanZ / 2, 0],
        [0, spanZ / 2],
      ]) {
        group.add(
          createMemberBetween(
            new THREE.Vector3(-bayX / 2, getRoofY(z1), z1),
            new THREE.Vector3(bayX / 2, getRoofY(z2), z2),
            0.04,
            0.04,
            braceMat,
            true
          ),
          createMemberBetween(
            new THREE.Vector3(-bayX / 2, getRoofY(z2), z2),
            new THREE.Vector3(bayX / 2, getRoofY(z1), z1),
            0.04,
            0.04,
            braceMat,
            true
          )
        );
      }

      // +4.5m 懸挑設備平台 + BR1 雙斜撐 (設於右側柱列 +spanZ/2 向內懸挑 1.5m)
      const platY = 3.3;
      const zOut = spanZ / 2;
      const zIn = spanZ / 2 - 1.5;
      for (const px of [-bayX / 2, 0, bayX / 2]) {
        group.add(
          createMemberBetween(
            new THREE.Vector3(px, platY, zOut),
            new THREE.Vector3(px, platY, zIn),
            0.12,
            0.15,
            haunchMat
          )
        );
      }
      for (const px of [-bayX / 2, bayX / 2]) {
        group.add(
          createMemberBetween(
            new THREE.Vector3(px, platY - 1.3, zOut),
            new THREE.Vector3(px, platY - 0.04, zIn + 0.1),
            0.12,
            0.12,
            haunchMat
          )
        );
      }
      const platDeck = new THREE.Mesh(
        new THREE.BoxGeometry(bayX + 0.2, 0.07, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 })
      );
      platDeck.position.set(0, platY + 0.08, (zOut + zIn) / 2);
      group.add(platDeck);

      // 屋面 C150×50 檁條層 (+expOffset * 0.4)
      const purlinLayerOff = 0.25 + expOffset * 0.45;
      for (let zp = -spanZ / 2 - 0.4; zp <= spanZ / 2 + 0.4; zp += 1.05) {
        const cBar = new THREE.Mesh(new THREE.BoxGeometry(bayX + 1.6, 0.12, 0.06), purlinMat);
        cBar.position.set(0, getRoofY(zp) + purlinLayerOff, zp);
        group.add(cBar);
      }

      // 半透明 0.6mm 清浪板 + 屋脊中脊板 + 鋁擠支架 (浪板區綠色 h 腳座 vs 屋脊橘紅色 L 腳座)
      const sheetLayerOff = purlinLayerOff + 0.14 + expOffset * 0.45;
      const sheetMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: xrayMode ? 0.35 : 0.85,
        side: THREE.DoubleSide,
      });
      const halfSlope = (spanZ / 2 + 0.6) / Math.cos(0.11);
      const sheetL = new THREE.Mesh(new THREE.BoxGeometry(bayX + 1.6, 0.02, halfSlope), sheetMat);
      sheetL.position.set(0, getRoofY(-spanZ / 4) + sheetLayerOff, -spanZ / 4 - 0.15);
      sheetL.rotation.x = -0.17;
      const sheetR = new THREE.Mesh(new THREE.BoxGeometry(bayX + 1.6, 0.02, halfSlope), sheetMat);
      sheetR.position.set(0, getRoofY(spanZ / 4) + sheetLayerOff, spanZ / 4 + 0.15);
      sheetR.rotation.x = 0.17;
      const ridgeCap = new THREE.Mesh(
        new THREE.BoxGeometry(bayX + 1.6, 0.035, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      ridgeCap.position.set(0, ridgeH + sheetLayerOff + 0.02, 0);
      group.add(sheetL, sheetR, ridgeCap);

      // 40×40 側開鋁擠支架與腳座 (屋脊處 L 腳座 [橘紅] vs 浪板區 h 腳座 [亮綠])
      const railLayerOff = sheetLayerOff + 0.16 + expOffset * 0.4;
      for (const rx of [-2.1, -0.7, 0.7, 2.1]) {
        // 左右坡鋁軌
        group.add(
          createMemberBetween(
            new THREE.Vector3(rx, getRoofY(-spanZ / 2) + railLayerOff, -spanZ / 2),
            new THREE.Vector3(rx, getRoofY(-0.5) + railLayerOff, -0.5),
            0.05,
            0.05,
            purlinMat
          ),
          createMemberBetween(
            new THREE.Vector3(rx, getRoofY(0.5) + railLayerOff, 0.5),
            new THREE.Vector3(rx, getRoofY(spanZ / 2) + railLayerOff, spanZ / 2),
            0.05,
            0.05,
            purlinMat
          )
        );

        // 屋脊中脊板上的 L 型腳座 (橘紅色高亮)
        for (const lz of [-0.55, 0.55]) {
          const lFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.12), lFootMat);
          lFoot.position.set(rx, getRoofY(lz) + railLayerOff - 0.08, lz);
          group.add(lFoot);
        }
        // 一般浪板波峰上的 h 型腳座 (亮綠色高亮)
        for (const hz of [-5.2, -3.5, -1.8, 1.8, 3.5, 5.2]) {
          const hFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.1), hFootMat);
          hFoot.position.set(rx, getRoofY(hz) + railLayerOff - 0.08, hz);
          group.add(hFoot);
        }
      }

      // 屋脊中央菱形網維修走道 + 屋面四周 1m 高安全母索立柱 (附 50cm 內向斜撐)
      const walkDeck = new THREE.Mesh(
        new THREE.BoxGeometry(bayX + 1.5, 0.04, 0.65),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b })
      );
      walkDeck.position.set(0, ridgeH + railLayerOff + 0.06, 0);
      group.add(walkDeck);

      const postRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
      for (const zEdge of [-spanZ / 2 - 0.3, spanZ / 2 + 0.3]) {
        const dirIn = zEdge > 0 ? -1 : 1;
        const yB = getRoofY(zEdge) + sheetLayerOff;
        for (let px = -bayX / 2 - 0.5; px <= bayX / 2 + 0.5; px += 2.2) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), postRedMat);
          post.position.set(px, yB + 0.5, zEdge);
          group.add(
            post,
            createMemberBetween(
              new THREE.Vector3(px, yB + 0.5, zEdge),
              new THREE.Vector3(px, getRoofY(zEdge + dirIn * 0.5) + sheetLayerOff, zEdge + dirIn * 0.5),
              0.04,
              0.04,
              postRedMat
            )
          );
        }
      }
    } else if (activeDiscipline === 'MEP') {
      // =======================================================================
      // ⚡ 3. 機電與台電併網工程 3D 演示：
      //    - 屋頂太陽能模組串列 (正極紅線 / 負極黑線) 匯入中央屋脊 #A (100×100mm) DC 主幹鋁線槽
      //    - #A 線槽於北端轉折並沿軸 5/A 鋼柱垂直下引至 +4.5m 設備平台
      //    - +4.5m 設備平台機電群：DC-1 / DC-2 直流箱 -> INV-1 (110kW) & INV-2 (30kW) 新望變流器 -> #B AC 線槽 -> AC-1 主配電盤 & 監控箱
      //    - #C & #D (Ø82mm RSG 金屬管 × 2 管) 沿柱下地埋設至 1F 東北角 3Φ4W 附 CT 雙門不鏽鋼電表箱 (寬1350×高2150mm)
      //    - E22 (R<10Ω 設備接地) 與 E30 (R<50Ω 系統接地) 綠色接地幹線與接地銅棒
      // =======================================================================
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.target.set(1.5, 3.5, 0);
        cameraRef.current.position.set(14.5, 9.0, 15.5);
        controlsRef.current.update();
      }

      const ghostSteelMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.28,
      });
      const trayAMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // #A DC 100×100 鋁線槽 (亮天藍)
        metalness: 0.6,
        roughness: 0.25,
      });
      const trayBMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7, // #B AC 100×100 鋁線槽 (亮紫色)
        metalness: 0.6,
        roughness: 0.25,
      });
      const conduitCDMat = new THREE.MeshStandardMaterial({
        color: 0xf97316, // #C/#D Ø82mm RSG 金屬管幹線 (醒目亮橘色)
        metalness: 0.5,
        roughness: 0.3,
      });
      const invMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626, // 新望變流器紅機身
        roughness: 0.3,
      });
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.5,
        roughness: 0.3,
      });
      const groundWireMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e, // E22 / E30 接地系統 (亮綠色)
        roughness: 0.3,
      });
      const dcRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const dcBlackMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const spanZ = 10.0;
      const lenX = 10.0;
      const eaveH = 5.0;
      const ridgeH = 6.0;
      const getRoofY = (z: number) => ridgeH - (Math.abs(z) / (spanZ / 2)) * (ridgeH - eaveH);

      // 半透明背景鋼構骨架供空間定位參考
      for (const fx of [-lenX / 2, 0, lenX / 2]) {
        for (const fz of [-spanZ / 2, spanZ / 2]) {
          group.add(
            createMemberBetween(
              new THREE.Vector3(fx, 0, fz),
              new THREE.Vector3(fx, eaveH, fz),
              0.24,
              0.24,
              ghostSteelMat
            )
          );
        }
        group.add(
          createMemberBetween(
            new THREE.Vector3(fx, eaveH, -spanZ / 2),
            new THREE.Vector3(fx, ridgeH, 0),
            0.22,
            0.3,
            ghostSteelMat
          ),
          createMemberBetween(
            new THREE.Vector3(fx, ridgeH, 0),
            new THREE.Vector3(fx, eaveH, spanZ / 2),
            0.22,
            0.3,
            ghostSteelMat
          )
        );
      }

      // 屋頂太陽能模組串列與 DC 正負極串列線
      const modMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        transparent: true,
        opacity: xrayMode ? 0.55 : 0.9,
      });
      for (const sideZ of [-1, 1]) {
        for (let r = 1; r <= 3; r++) {
          const zPos = sideZ * (r * 1.35);
          const yPos = getRoofY(zPos) + 0.15 + expOffset * 0.3;
          for (let c = -3.8; c <= 3.8; c += 1.9) {
            const mod = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.04, 1.15), modMat);
            mod.position.set(c, yPos, zPos);
            mod.rotation.x = sideZ * 0.18;
            group.add(mod);
          }
          // 串列正極紅線與負極線匯入中央屋脊 #A 線槽
          group.add(
            createMemberBetween(
              new THREE.Vector3(-4.2, yPos - 0.04, zPos),
              new THREE.Vector3(4.2, yPos - 0.04, zPos),
              0.035,
              0.035,
              dcRedMat,
              true
            ),
            createMemberBetween(
              new THREE.Vector3(4.2, yPos - 0.04, zPos),
              new THREE.Vector3(4.2, ridgeH + 0.2, 0),
              0.035,
              0.035,
              dcBlackMat,
              true
            )
          );
        }
      }

      // ① #A 屋脊中央 100×100mm DC 主幹鋁線槽 -> 北端橫越 -> 沿軸 5/A 柱垂直下引至 +4.5m 設備平台
      const pRidgeStart = new THREE.Vector3(-lenX / 2, ridgeH + 0.2, 0);
      const pRidgeEnd = new THREE.Vector3(lenX / 2, ridgeH + 0.2, 0);
      const pEaveCorner = new THREE.Vector3(lenX / 2, eaveH + 0.2, spanZ / 2);
      const platY = 3.2;
      const pPlatDrop = new THREE.Vector3(lenX / 2, platY + 1.1, spanZ / 2);
      const pPlatHoriz = new THREE.Vector3(0.5, platY + 1.1, spanZ / 2 - 0.2);

      group.add(
        createMemberBetween(pRidgeStart, pRidgeEnd, 0.18, 0.16, trayAMat),
        createMemberBetween(pRidgeEnd, pEaveCorner, 0.18, 0.16, trayAMat),
        createMemberBetween(pEaveCorner, pPlatDrop, 0.16, 0.16, trayAMat),
        createMemberBetween(pPlatDrop, pPlatHoriz, 0.16, 0.16, trayAMat)
      );

      // ② +4.5m 設備平台及機電盤體群 (DC-1, DC-2, INV-1 110kW, INV-2 30kW, #B 線槽, AC-1 主盤, 監控箱)
      const platSlab = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.1, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      platSlab.position.set(2.7, platY, spanZ / 2 - 0.75);
      group.add(platSlab);

      // DC-1 & INV-1 (110kW) & INV-2 (30kW) & DC-2
      const dc1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.28), boxMat);
      dc1.position.set(4.3, platY + 0.65, spanZ / 2 - 0.25);
      const inv1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 0.34), invMat);
      inv1.position.set(3.2, platY + 0.68, spanZ / 2 - 0.25);
      const inv2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.28), invMat);
      inv2.position.set(2.0, platY + 0.65, spanZ / 2 - 0.25);
      const dc2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.25), boxMat);
      dc2.position.set(1.1, platY + 0.6, spanZ / 2 - 0.25);

      // AC-1 交流配電盤 & 監控箱
      const ac1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.32), boxMat);
      ac1.position.set(2.6, platY + 0.55, spanZ / 2 - 1.3);
      group.add(dc1, inv1, inv2, dc2, ac1);

      // #B 100×100mm AC 分路鋁線槽 (連接 INV-1/INV-2 至 AC-1)
      group.add(
        createMemberBetween(
          new THREE.Vector3(1.8, platY + 0.22, spanZ / 2 - 0.25),
          new THREE.Vector3(3.5, platY + 0.22, spanZ / 2 - 0.25),
          0.14,
          0.14,
          trayBMat
        ),
        createMemberBetween(
          new THREE.Vector3(2.6, platY + 0.22, spanZ / 2 - 0.25),
          new THREE.Vector3(2.6, platY + 0.22, spanZ / 2 - 1.3),
          0.14,
          0.14,
          trayBMat
        )
      );

      // ③ 1F 新設 3Φ4W 低壓附 CT 雙門不鏽鋼電表箱 (KWH-PV 寬750 + 受電箱 寬600 = 總寬1350 × 高2150 × 深500 mm)
      const meterX = lenX / 2 + 2.8;
      const meterZ = spanZ / 2 - 0.3;
      const meterPed = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.2, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x64748b })
      );
      meterPed.position.set(meterX, 0.1, meterZ);
      const kwhBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.15, 0.5), boxMat);
      kwhBox.position.set(meterX - 0.35, 1.25, meterZ);
      const recBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.15, 0.5), boxMat);
      recBox.position.set(meterX + 0.35, 1.25, meterZ);
      const ctWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.25, 0.54),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      ctWin.position.set(meterX - 0.35, 1.65, meterZ);
      group.add(meterPed, kwhBox, recBox, ctWin);

      // ④ #C & #D Ø82mm (3") RSG 金屬管 × 2 管 (AC-1 -> 沿 SC7 柱下地 -> 1F 附 CT 電表箱與受電箱)
      for (const offZ of [-0.08, 0.08]) {
        const pAc = new THREE.Vector3(2.6, platY + 0.15, spanZ / 2 - 1.2 + offZ);
        const pColTop = new THREE.Vector3(lenX / 2 + 0.18, platY + 0.15, spanZ / 2 + offZ);
        const pColBot = new THREE.Vector3(lenX / 2 + 0.18, -0.25, spanZ / 2 + offZ);
        const pMeterBot = new THREE.Vector3(meterX + (offZ < 0 ? -0.35 : 0.35), -0.25, meterZ + offZ);
        const pMeterIn = new THREE.Vector3(meterX + (offZ < 0 ? -0.35 : 0.35), 0.3, meterZ + offZ);

        group.add(
          createMemberBetween(pAc, pColTop, 0.09, 0.09, conduitCDMat, true),
          createMemberBetween(pColTop, pColBot, 0.09, 0.09, conduitCDMat, true),
          createMemberBetween(pColBot, pMeterBot, 0.09, 0.09, conduitCDMat, true),
          createMemberBetween(pMeterBot, pMeterIn, 0.09, 0.09, conduitCDMat, true)
        );
      }

      // ⑤ E22 (<10Ω 設備接地) 與 E30 (<50Ω 系統接地) 綠色接地母線與地下接地銅棒組
      for (const gxBase of [lenX / 2 + 0.6, meterX + 1.2]) {
        for (const gzOff of [-0.4, 0, 0.4]) {
          const rod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8),
            groundWireMat
          );
          rod.position.set(gxBase, -0.6, meterZ + gzOff);
          group.add(rod);
        }
        group.add(
          createMemberBetween(
            new THREE.Vector3(gxBase, -0.05, meterZ - 0.4),
            new THREE.Vector3(gxBase, -0.05, meterZ + 0.4),
            0.04,
            0.04,
            groundWireMat,
            true
          )
        );
      }
      group.add(
        createMemberBetween(
          new THREE.Vector3(lenX / 2 + 0.6, ridgeH + 0.1, 0),
          new THREE.Vector3(lenX / 2 + 0.6, -0.05, meterZ),
          0.04,
          0.04,
          groundWireMat,
          true
        )
      );
    }
  }, [activeDiscipline, xrayMode, explodedView]);

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (activeDiscipline === 'CIVIL') {
      controlsRef.current.target.set(0, 1.5, 0);
      cameraRef.current.position.set(8.5, 6.2, 9.5);
    } else if (activeDiscipline === 'STEEL') {
      controlsRef.current.target.set(0, 4.2, 0);
      cameraRef.current.position.set(13.5, 9.5, 15.0);
    } else {
      controlsRef.current.target.set(1.5, 3.5, 0);
      cameraRef.current.position.set(14.5, 9.0, 15.5);
    }
    controlsRef.current.update();
  };

  return (
    <div
      className="fixed inset-0 z-[220] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Modal Header with Discipline Switcher */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
              <Box size={20} />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                工程專項 3D 結構與工序互動演示中心
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                  土木 × 鋼構 × 機電
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                可自由切換三大工程項目、開啟半透明透視鋼筋/管線或分層爆炸演示，並直接跳轉下載或上傳該類圖說母版
              </p>
            </div>
          </div>

          {/* 3 Engineering Discipline Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ENGINEERING_DISCIPLINES.map(d => {
              const isAct = d.id === activeDiscipline;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveDiscipline(d.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isAct
                      ? `bg-gradient-to-r ${d.badgeColor} text-white shadow-md ring-2 ring-white/30`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>
                    {d.id === 'CIVIL' ? '🧱' : d.id === 'STEEL' ? '🏗️' : '⚡'} {d.name}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Body: Left 3D Interactive Canvas + Right Engineering Specs & Deliverables */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left: 3D Interactive Viewport (7 cols) */}
          <div className="lg:col-span-7 relative bg-slate-950 flex flex-col min-h-[360px]">
            {/* Floating 3D Controls */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700 pointer-events-auto text-xs">
                <button
                  type="button"
                  onClick={() => setXrayMode(v => !v)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    xrayMode ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Eye size={13} />
                  {activeDiscipline === 'CIVIL'
                    ? '透視混凝土看鋼筋籠'
                    : activeDiscipline === 'STEEL'
                    ? '半透明浪板看鋼構/腳座'
                    : '半透明模組看串列線槽'}
                </button>
                <button
                  type="button"
                  onClick={() => setExplodedView(v => !v)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    explodedView ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Layers size={13} /> 垂直爆炸分解演示
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-slate-700 pointer-events-auto text-xs">
                <button
                  type="button"
                  onClick={() => setAutoRotate(v => !v)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${
                    autoRotate ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {autoRotate ? <Pause size={13} /> : <Play size={13} />} 自動環繞
                </button>
                <button
                  type="button"
                  onClick={resetCamera}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="重置視角"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Color Legend Overlay at Bottom */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-slate-900/85 backdrop-blur-md text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {activeDiscipline === 'CIVIL' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-sky-400 inline-block" /> 8-#6 連續地梁主筋
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" /> #4@15cm 箍筋
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-yellow-400 inline-block" /> 8-M20×170L 化學錨栓 & 防撞墊
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-slate-600 inline-block" /> PL20×500 柱底板 + 8片加勁板
                  </span>
                </div>
              )}
              {activeDiscipline === 'STEEL' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-sky-400 inline-block" /> SC 主柱 & SG 雙坡大梁
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" /> H10 斜隅加腋 & +4.5m 平台斜撐
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-orange-500 inline-block" /> 屋脊中脊板 L 型腳座
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-green-500 inline-block" /> 浪板波峰 h 型腳座
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" /> 1m 安全母索立柱 + 50cm 斜撐
                  </span>
                </div>
              )}
              {activeDiscipline === 'MEP' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-sky-400 inline-block" /> #A 屋脊 100×100 DC 鋁線槽
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-red-600 inline-block" /> 新望 110kW+30kW 變流器
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-purple-500 inline-block" /> #B 100×100 AC 鋁線槽
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-orange-500 inline-block" /> #C/#D Ø82mm RSG 幹線管 → 1F CT表箱
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-green-500 inline-block" /> E22/E30 接地銅棒系統
                  </span>
                </div>
              )}
            </div>

            <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />
          </div>

          {/* Right: Engineering Checkpoints, Deliverables & Actions (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 p-5 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${currentMeta.borderColor} ${currentMeta.bgLight}`}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-black text-white bg-gradient-to-r ${currentMeta.badgeColor}`}
                  >
                    工程分類：{currentMeta.code} 類
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{currentMeta.enName}</span>
                </div>
                <h4 className={`text-lg font-black mt-1.5 ${currentMeta.textColor}`}>{currentMeta.name}</h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{currentMeta.summary}</p>
              </div>

              {/* 3D 演示重點解析 */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  3D 建模構造與設計審圖檢核要點
                </h5>
                {currentMeta.checkpoints.map((cp, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-indigo-600 shrink-0" />
                      <span>{cp.title}</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded border border-indigo-100">
                      規格：{cp.spec}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-0.5">{cp.detail}</p>
                  </div>
                ))}
              </div>

              {/* 該工程分類標準交付圖說與母版 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <h5 className="text-xs font-extrabold text-slate-700">
                  📋 【{currentMeta.name}】標準必備圖說與母版清單：
                </h5>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  {currentMeta.deliverables.map((item, i) => (
                    <li key={i} className="font-medium">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Action Buttons: Filter files or Upload new template for this discipline */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5">
              {onFilterFilesByDiscipline && (
                <button
                  type="button"
                  onClick={() => {
                    onFilterFilesByDiscipline(activeDiscipline);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <FolderOpen size={16} /> 查看並下載【{currentMeta.name}】全部圖說母版
                </button>
              )}
              {onOpenUploadModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUploadModal(activeDiscipline);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Upload size={16} /> 上傳【{currentMeta.name}】母版
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
