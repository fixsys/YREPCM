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
    enName: 'Civil & Foundation Engineering (F1 Rebar Cage)',
    badgeColor: 'from-amber-600 to-stone-800',
    borderColor: 'border-amber-300',
    bgLight: 'bg-amber-50/70',
    textColor: 'text-amber-900',
    summary:
      '依據《基礎鋼筋綁紮示意圖(F1)》標準建模：總開挖深度 GL-1300mm（100mm 打底層 + 2000×2000×300mm RC 基礎底版 #4@15 雙向鋼筋網 + 700×700×700mm 柱墩：#6 主筋 16 支、#4 箍筋 5 支 [4@150=600]、#3 繫筋 30 支）+ 5cm 無收縮水泥 + A.B 8-M25 L=600 基礎螺栓 + PL-19×500×500 柱底板 + PL12 加勁板 + RH300×300×10×15 鋼柱。',
    deliverables: [
      '基礎鋼筋綁紮示意圖 (F1：2000×2000 底版 + 700×700 柱墩配筋) (.pdf)',
      '柱底板與基礎螺栓配置詳圖 (PL-19×500×500 + A.B 8-M25 L=600)',
      '現場收方及柱位退縮圖 (.dwg)',
    ],
    checkpoints: [
      {
        title: '1. 基礎底版 RC 與 #4@15 雙向鋼筋網 (GL-900 ~ GL-1200)',
        spec: '底版 2000×2000×300mm（保護層 50mm，鋼筋網 1900×1900mm）+ 底部 100mm 打底 (GL-1300)',
        detail: '底版採用 #4@15cm 雙向正交鋼筋網（雙向各 14 支 #4 鋼筋，四端向上 90° 標準彎鉤立腳）。',
      },
      {
        title: '2. 700×700 柱墩鋼筋籠 (#6主筋16支 + #4箍筋5支 + #3繫筋30支)',
        spec: '柱墩高 700mm (GL-200 ~ GL-900)，保護層 50mm (箍筋框 600×600mm)',
        detail: '垂直主筋採 16 支 #6 鋼筋（四周每邊 5 支均佈，底部伸入底版 90° 向外彎鉤）；水平箍筋採 5 支 #4 鋼筋 (4@150=600)；每層箍筋內綁紮 6 支雙向 #3 繫筋（5層×6支 = 共 30 支 #3 繫筋）。',
      },
      {
        title: '3. 柱腳 A.B 8-M25 (L=600) 基礎螺栓與 PL-19×500×500 底板',
        spec: 'GL-200 柱墩頂面 + 5cm 無收縮水泥土 + PL-19×500×500 + PL12 加勁板 + RH300×300×10×15',
        detail: '8 支 M25 基礎螺栓 (L=600mm，底部 J 型彎鉤預埋入柱墩鋼筋籠內)，孔位 X 向 50+200+200+50=500mm、Y 向 50+144+212+144+50=500mm，柱底板與基礎間灌注 5cm 無收縮水泥。',
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
      // 🧱 1. 土木與基礎工程 3D 演示 — 1:1 嚴格依據《基礎鋼筋綁紮示意圖.pdf (F1)》建模
      //   (單位換算：1m = 2.0 3D 單位，讓鋼筋籠細節在視窗中極致清晰呈現)
      //   高程對應 (以 GL+0 為 Y = +2.4, GL-1300 為 Y = -0.2)：
      //   - GL-1300 ~ GL-1200 (厚 100mm)：底層 PC 打底混凝土層 (2100×2100×100mm)
      //   - GL-1200 ~ GL-900  (厚 300mm)：獨立基礎底版 RC (2000×2000×300mm，保護層 50mm)
      //       • 底版鋼筋網：1900×1900mm 範圍雙向 #4@15cm 正交鋼筋網 (雙向各 14 支 #4 鋼筋，兩端 90° 向上彎鉤 200mm)
      //   - GL-900  ~ GL-200  (高 700mm)：700×700×700mm 柱墩 RC (保護層 50mm，鋼筋籠外框 600×600mm)
      //       • #6 鋼筋(主筋) 16 支：沿 600×600mm 周界每邊 5 支均佈 (間距 150mm)，自 GL-1120 貫穿至 GL-250，底部向外 90° 彎鉤錨定於底版網
      //       • #4 鋼筋(箍筋) 5 支：4@150 = 600mm (位於柱墩內 5 個高程)，600×600mm 閉合矩形箍筋
      //       • #3 鋼筋(繫筋) 30 支：每層箍筋配置 X 向 3 支 + Z 向 3 支 = 6 支對拉繫筋 (含兩端 135° 彎鉤) × 5 層 = 30 支！
      //   - GL-200  ~ GL-150  (厚 50mm) ：5CM 無收縮水泥土 (540×540×50mm)
      //   - A.B 8-M25 L=600 基礎螺栓：8 支 M25 錨栓 (孔位 X: ±200, 0; Z: ±200, ±106/0)，埋入柱墩 500mm + 底部 J 型彎鉤
      //   - PL-19×500×500 柱底板 + PL12 加勁板 + RH300×300×10×15 主鋼柱
      // =======================================================================
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.target.set(0, 1.8, 0);
        cameraRef.current.position.set(6.2, 5.2, 6.8);
        controlsRef.current.update();
      }

      const S = 2.0; // 放大倍率：1 公尺 (1000mm) = 2.0 Three.js 單位
      // 將 GL-1200 (底版底面) 設在 Y = 0，則：
      // GL-1300 = -0.1m * S = -0.2
      // GL-1200 =  0.0m * S =  0.0
      // GL-900  = +0.3m * S = +0.6 (底版頂面 / 柱墩底面)
      // GL-200  = +1.0m * S = +2.0 (柱墩頂面)
      // GL+0    = +1.2m * S = +2.4 (地表線)

      const concreteMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.65,
        transparent: true,
        opacity: xrayMode ? 0.24 : 0.92,
        depthWrite: !xrayMode,
      });
      const concreteWireMat = new THREE.LineBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.55,
      });
      const matFootingRebar = new THREE.MeshStandardMaterial({
        color: 0x10b981, // 底版 #4@15 雙向鋼筋網 (祖母綠)
        metalness: 0.55,
        roughness: 0.3,
      });
      const matMainRebar6 = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // #6 鋼筋(主筋) 16支 (亮天藍)
        metalness: 0.65,
        roughness: 0.25,
      });
      const matStirrup4 = new THREE.MeshStandardMaterial({
        color: 0xef4444, // #4 鋼筋(箍筋) 5支 (4@150=600) (醒目紅)
        metalness: 0.55,
        roughness: 0.3,
      });
      const matCrossTie3 = new THREE.MeshStandardMaterial({
        color: 0xa855f7, // #3 鋼筋(繫筋) 30支 (亮紫羅蘭色)
        metalness: 0.55,
        roughness: 0.3,
      });
      const matAnchorBolt = new THREE.MeshStandardMaterial({
        color: 0xfacc15, // A.B 8-M25 L=600 基礎螺栓 (亮金色)
        metalness: 0.75,
        roughness: 0.2,
      });
      const matGrout = new THREE.MeshStandardMaterial({
        color: 0xd6d3d1, // 5CM 無收縮水泥土
        roughness: 0.8,
      });
      const matSteelPlate = new THREE.MeshStandardMaterial({
        color: 0x334155, // PL-19×500×500 柱底板 + PL12 加勁板 + RH300×300×10×15
        metalness: 0.7,
        roughness: 0.28,
      });

      // 1. GL-1300 ~ GL-1200 (100mm PC 打底層)
      const pcGeo = new THREE.BoxGeometry(2.15 * S, 0.1 * S, 2.15 * S);
      const pcMesh = new THREE.Mesh(
        pcGeo,
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
      );
      pcMesh.position.set(0, -0.05 * S, 0);
      group.add(pcMesh);

      // 2. GL-1200 ~ GL-900 (2000×2000×300mm RC 基礎底版)
      const footGeo = new THREE.BoxGeometry(2.0 * S, 0.3 * S, 2.0 * S);
      const footMesh = new THREE.Mesh(footGeo, concreteMat);
      footMesh.position.set(0, 0.15 * S, 0);
      const footEdges = new THREE.LineSegments(new THREE.EdgesGeometry(footGeo), concreteWireMat);
      footEdges.position.copy(footMesh.position);
      group.add(footMesh, footEdges);

      // 3. 底版內部 1900×1900mm 雙向 #4@15 鋼筋網 (保護層 50mm，雙向各 14 支，間距 ~146mm ≈ 15cm)
      const matSpan = 1.9 * S; // 1900mm
      const numMatBars = 14; // 13 格 @ ~146mm = 1900mm (#4@15)
      const barRad4 = 0.009 * S; // #4 鋼筋半徑示意
      const yBottomX = 0.05 * S; // 底面保護層 50mm
      const yBottomZ = 0.05 * S + barRad4 * 2.1; // 上下交疊
      const hookHeight = 0.19 * S; // 兩端向上 90° 彎鉤立腳

      for (let i = 0; i < numMatBars; i++) {
        const offset = -matSpan / 2 + (i / (numMatBars - 1)) * matSpan;

        // X 向 #4 鋼筋 + 兩端向上 90° 彎鉤
        group.add(
          createMemberBetween(
            new THREE.Vector3(-matSpan / 2, yBottomX, offset),
            new THREE.Vector3(matSpan / 2, yBottomX, offset),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          ),
          createMemberBetween(
            new THREE.Vector3(-matSpan / 2, yBottomX, offset),
            new THREE.Vector3(-matSpan / 2, yBottomX + hookHeight, offset),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          ),
          createMemberBetween(
            new THREE.Vector3(matSpan / 2, yBottomX, offset),
            new THREE.Vector3(matSpan / 2, yBottomX + hookHeight, offset),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          )
        );

        // Z 向 #4 鋼筋 + 兩端向上 90° 彎鉤
        group.add(
          createMemberBetween(
            new THREE.Vector3(offset, yBottomZ, -matSpan / 2),
            new THREE.Vector3(offset, yBottomZ, matSpan / 2),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          ),
          createMemberBetween(
            new THREE.Vector3(offset, yBottomZ, -matSpan / 2),
            new THREE.Vector3(offset, yBottomZ + hookHeight, -matSpan / 2),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          ),
          createMemberBetween(
            new THREE.Vector3(offset, yBottomZ, matSpan / 2),
            new THREE.Vector3(offset, yBottomZ + hookHeight, matSpan / 2),
            barRad4 * 2,
            barRad4 * 2,
            matFootingRebar,
            true
          )
        );
      }

      // 4. GL-900 ~ GL-200 (700×700×700mm 柱墩 RC 混凝土外廓，保護層 50mm)
      const pedGeo = new THREE.BoxGeometry(0.7 * S, 0.7 * S, 0.7 * S);
      const pedMesh = new THREE.Mesh(pedGeo, concreteMat);
      pedMesh.position.set(0, (0.3 + 0.35) * S, 0);
      const pedEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pedGeo), concreteWireMat);
      pedEdges.position.copy(pedMesh.position);
      group.add(pedMesh, pedEdges);

      // 5. 柱墩鋼筋籠：
      //    (a) #6 鋼筋(主筋) 16 支 (沿 600×600mm 箍筋框周界：每邊 5 支 = 16 支，座標 -300, -150, 0, +150, +300 mm)
      const cageHalf = 0.3 * S; // 600mm / 2 = 300mm
      const grid5 = [-0.3 * S, -0.15 * S, 0, 0.15 * S, 0.3 * S];
      const mainBarCoords: [number, number][] = [];
      grid5.forEach((x, ix) => {
        grid5.forEach((z, iz) => {
          // 僅取周界上的 16 個點 (5×5 外框 = 16 支)
          if (ix === 0 || ix === 4 || iz === 0 || iz === 4) {
            mainBarCoords.push([x, z]);
          }
        });
      });

      const barRad6 = 0.013 * S; // #6 主筋直徑 19mm
      const mainBotY = 0.075 * S; // 深入底版鋼筋網頂面
      const mainTopY = (1.0 - 0.05) * S; // GL-200 下方 50mm 保護層 (y = 0.95m)

      mainBarCoords.forEach(([mx, mz]) => {
        // 垂直主筋段
        group.add(
          createMemberBetween(
            new THREE.Vector3(mx, mainBotY, mz),
            new THREE.Vector3(mx, mainTopY, mz),
            barRad6 * 2,
            barRad6 * 2,
            matMainRebar6,
            true
          )
        );
        // 底部向外 90° 標準錨定彎鉤 (長 220mm，貼於底版鋼筋網上)
        const dirVec = new THREE.Vector3(mx, 0, mz).normalize();
        const hookEnd = new THREE.Vector3(
          mx + dirVec.x * 0.22 * S,
          mainBotY,
          mz + dirVec.z * 0.22 * S
        );
        group.add(
          createMemberBetween(
            new THREE.Vector3(mx, mainBotY, mz),
            hookEnd,
            barRad6 * 2,
            barRad6 * 2,
            matMainRebar6,
            true
          )
        );
      });

      //    (b) #4 鋼筋(箍筋) 5 支 (4@150 = 600mm) + (c) #3 鋼筋(繫筋) 30 支 (5 層 × 每層 6 支雙向繫筋 = 30 支)
      const stirrupElevationsM = [0.35, 0.5, 0.65, 0.8, 0.95]; // 4@150mm = 600mm (位於 GL-850 ~ GL-250)
      const barRad3 = 0.0065 * S; // #3 繫筋

      stirrupElevationsM.forEach(ym => {
        const sy = ym * S;
        const c1 = new THREE.Vector3(-cageHalf, sy, -cageHalf);
        const c2 = new THREE.Vector3(cageHalf, sy, -cageHalf);
        const c3 = new THREE.Vector3(cageHalf, sy, cageHalf);
        const c4 = new THREE.Vector3(-cageHalf, sy, cageHalf);

        // 外圈 600×600mm #4 閉合箍筋 (4 邊)
        group.add(
          createMemberBetween(c1, c2, barRad4 * 2, barRad4 * 2, matStirrup4, true),
          createMemberBetween(c2, c3, barRad4 * 2, barRad4 * 2, matStirrup4, true),
          createMemberBetween(c3, c4, barRad4 * 2, barRad4 * 2, matStirrup4, true),
          createMemberBetween(c4, c1, barRad4 * 2, barRad4 * 2, matStirrup4, true)
        );

        // 內部 6 支 #3 雙向繫筋 (3 支平行 X 軸 + 3 支平行 Z 軸，勾住中間 3 排 #6 主筋，5 層 × 6 支 = 30 支！)
        for (const midCoord of [-0.15 * S, 0, 0.15 * S]) {
          // 平行 X 軸繫筋 + 兩端 135° 彎鉤
          const pX1 = new THREE.Vector3(-cageHalf, sy + 0.01, midCoord);
          const pX2 = new THREE.Vector3(cageHalf, sy + 0.01, midCoord);
          group.add(
            createMemberBetween(pX1, pX2, barRad3 * 2, barRad3 * 2, matCrossTie3, true),
            createMemberBetween(
              pX1,
              new THREE.Vector3(-cageHalf + 0.045 * S, sy + 0.01, midCoord + 0.035 * S),
              barRad3 * 1.8,
              barRad3 * 1.8,
              matCrossTie3,
              true
            ),
            createMemberBetween(
              pX2,
              new THREE.Vector3(cageHalf - 0.045 * S, sy + 0.01, midCoord - 0.035 * S),
              barRad3 * 1.8,
              barRad3 * 1.8,
              matCrossTie3,
              true
            )
          );

          // 平行 Z 軸繫筋 + 兩端 135° 彎鉤
          const pZ1 = new THREE.Vector3(midCoord, sy - 0.01, -cageHalf);
          const pZ2 = new THREE.Vector3(midCoord, sy - 0.01, cageHalf);
          group.add(
            createMemberBetween(pZ1, pZ2, barRad3 * 2, barRad3 * 2, matCrossTie3, true),
            createMemberBetween(
              pZ1,
              new THREE.Vector3(midCoord + 0.035 * S, sy - 0.01, -cageHalf + 0.045 * S),
              barRad3 * 1.8,
              barRad3 * 1.8,
              matCrossTie3,
              true
            ),
            createMemberBetween(
              pZ2,
              new THREE.Vector3(midCoord - 0.035 * S, sy - 0.01, cageHalf - 0.045 * S),
              barRad3 * 1.8,
              barRad3 * 1.8,
              matCrossTie3,
              true
            )
          );
        }
      });

      // 6. A.B 8-M25 L=600 基礎螺栓 (預埋入柱墩內，孔位嚴格對齊右上詳圖：500×500 底板，X: -200, 0, +200; Z: -200, ±106, +200)
      const abLift = expOffset * 0.35;
      const abCoordsM: [number, number][] = [
        [-0.2, -0.2],
        [0.0, -0.2],
        [0.2, -0.2],
        [-0.2, -0.056],
        [0.2, 0.056],
        [-0.2, 0.2],
        [0.0, 0.2],
        [0.2, 0.2],
      ];
      const boltRad = 0.014 * S; // M25
      const boltTopY = 1.15 * S + abLift;
      const boltBotY = (1.15 - 0.6) * S + abLift; // L = 600mm

      abCoordsM.forEach(([bx, bz]) => {
        const x3 = bx * S;
        const z3 = bz * S;
        group.add(
          createMemberBetween(
            new THREE.Vector3(x3, boltBotY, z3),
            new THREE.Vector3(x3, boltTopY, z3),
            boltRad * 2,
            boltRad * 2,
            matAnchorBolt,
            true
          ),
          // 底部 90° J 型錨定彎鉤
          createMemberBetween(
            new THREE.Vector3(x3, boltBotY, z3),
            new THREE.Vector3(x3 * 0.65, boltBotY, z3 * 0.65),
            boltRad * 2,
            boltRad * 2,
            matAnchorBolt,
            true
          )
        );
        // 雙螺帽與華司
        const nut = new THREE.Mesh(
          new THREE.CylinderGeometry(boltRad * 1.8, boltRad * 1.8, 0.03 * S, 6),
          matAnchorBolt
        );
        nut.position.set(x3, 1.09 * S + expOffset * 0.6, z3);
        group.add(nut);
      });

      // 7. 5CM 無收縮水泥土 (GL-200 ~ GL-150，位於柱墩頂面與 PL-19×500×500 之間)
      const groutY = 1.025 * S + expOffset * 0.45;
      const groutMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.54 * S, 0.05 * S, 0.54 * S),
        matGrout
      );
      groutMesh.position.set(0, groutY, 0);
      group.add(groutMesh);

      // 8. PL-19×500×500 柱底板 + PL12 加勁板 + RH300×300×10×15 主鋼柱
      const bpY = 1.06 * S + expOffset * 0.65;
      const bpMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * S, 0.019 * S, 0.5 * S),
        matSteelPlate
      );
      bpMesh.position.set(0, bpY, 0);
      group.add(bpMesh);

      // PL12 加勁板 (對齊右上詳圖：左右翼板外側與腹板兩側加勁板)
      for (const sx of [-0.155 * S, 0.155 * S]) {
        for (const sz of [-0.1 * S, 0.1 * S]) {
          const stiff = new THREE.Mesh(
            new THREE.BoxGeometry(0.095 * S, 0.16 * S, 0.012 * S),
            matSteelPlate
          );
          stiff.position.set(sx + (sx > 0 ? 0.045 * S : -0.045 * S), bpY + 0.09 * S, sz);
          group.add(stiff);
        }
      }
      for (const sz of [-0.155 * S, 0.155 * S]) {
        const webStiff = new THREE.Mesh(
          new THREE.BoxGeometry(0.012 * S, 0.16 * S, 0.095 * S),
          matSteelPlate
        );
        webStiff.position.set(0, bpY + 0.09 * S, sz + (sz > 0 ? 0.045 * S : -0.045 * S));
        group.add(webStiff);
      }

      // RH300×300×10×15 主鋼柱 (自柱底板向上延伸至 GL+0 以上)
      const colStart = bpY + 0.01 * S;
      const colEnd = colStart + 1.15 * S;
      group.add(
        createHBeamBetween(
          new THREE.Vector3(0, colStart, 0),
          new THREE.Vector3(0, colEnd, 0),
          0.3 * S,
          0.3 * S,
          0.01 * S,
          0.015 * S,
          matSteelPlate
        )
      );

      // 9. GL+0 地表基準線半透明環框 (標示 GL+0 與柱墩頂 GL-200 之高程關係)
      const glRingGeo = new THREE.RingGeometry(0.85 * S, 1.35 * S, 4);
      glRingGeo.rotateY(Math.PI / 4);
      glRingGeo.rotateX(-Math.PI / 2);
      const glPlane = new THREE.Mesh(
        glRingGeo,
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        })
      );
      glPlane.position.set(0, 1.2 * S, 0); // GL+0 (高於柱墩頂 GL-200 200mm)
      group.add(glPlane);
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
      controlsRef.current.target.set(0, 1.8, 0);
      cameraRef.current.position.set(6.2, 5.2, 6.8);
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
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> 底版 1900×1900 #4@15 鋼筋網
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-sky-400 inline-block" /> #6 柱墩主筋 (16支)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" /> #4 箍筋 (5支, 4@150=600)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-purple-500 inline-block" /> #3 雙向繫筋 (30支)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-yellow-400 inline-block" /> A.B 8-M25 L=600 基礎螺栓
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-slate-500 inline-block" /> 5cm無收縮水泥 + PL-19×500×500
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
