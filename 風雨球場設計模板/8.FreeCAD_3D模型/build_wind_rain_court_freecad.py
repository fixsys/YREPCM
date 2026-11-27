# -*- coding: utf-8 -*-
"""
澎湖 A-5 嵵裡國小 / 風雨球場標準設計模板 - FreeCAD 3D 完整 BIM 建模腳本
涵蓋：
1. 土建基礎 (800x700 連續地梁、柱墩、8-M20錨栓、防撞墊、標準籃球場與球架)
2. 鋼構系統 (SC1~7 RH300x300柱、SG1~6 RH400x200雙坡大梁+H10斜隅、E1~4 RH300x150繫梁、CP1~4 RH250x125次梁、BK1~2 交叉風拉桿)
3. 設備平台與安全爬梯 (軸5 A~B +4500mm 平台 RH150x75 + BR1斜撐 + 花紋鋼板；軸1/G 護籠爬梯)
4. 屋面系統 (C150x50 C型鋼 22排、0.6mm清浪板、中脊板、白鐵水槽、屋頂菱形網步道、四周安全母索立柱與鋼索)
5. 鋁擠支架與太陽能模組 (40x40側開鋁支架 90列、h型腳座與屋脊L型腳座、同昱 550Wp 模組 285片 [19排x15列])
6. 逆變器、配電盤與全場線路 (INV-1 110kW、INV-2 30kW、DC-1/2、AC-1、監控箱、1F 3P4W附CT雙門電表箱、17串DC正負極串列線、#A/#B 100x100鋁線槽、#C/#D Ø82mm RSG金屬管幹線、E22/E30接地線與接地銅棒)
"""

import os
import math
import FreeCAD as App
import Part

# ==============================================================================
# 0. 建立文件與參數定義 (單位: mm)
# ==============================================================================
OUT_DIR = r"c:\Users\user\Desktop\YRDES\風雨球場設計模板\8.FreeCAD_3D模型"
os.makedirs(OUT_DIR, exist_ok=True)

doc = App.newDocument("WindRainCourt_156_75kWp")

# 結構軸線座標 (mm)
# X軸: 軸1 ~ 軸5 (跨距 5500 x 4 = 22000)
X_AXES = [0.0, 5500.0, 11000.0, 16500.0, 22000.0]
X_RIDGE = 11000.0
X_SPAN = 22000.0
X_OVERHANG = 1000.0  # 東西兩側屋面懸挑 1000mm

# Y軸: 軸G(0) -> F(5000) -> E(10500) -> D(16000) -> C(21500) -> B(26500) -> A(31500)
Y_AXES = [0.0, 5000.0, 10500.0, 16000.0, 21500.0, 26500.0, 31500.0]
Y_LABELS = ["G", "F", "E", "D", "C", "B", "A"]
Y_TOTAL_COL = 31500.0
Y_OVERHANG = 2400.0  # 南北兩端懸挑 2400mm (PP1=2395mm)
Y_MIN_ROOF = -Y_OVERHANG
Y_MAX_ROOF = Y_TOTAL_COL + Y_OVERHANG

# 高程與坡度 (6度雙坡)
ROOF_ANGLE_DEG = 6.0
ROOF_ANGLE_RAD = math.radians(ROOF_ANGLE_DEG)
TAN_A = math.tan(ROOF_ANGLE_RAD)
COS_A = math.cos(ROOF_ANGLE_RAD)
SIN_A = math.sin(ROOF_ANGLE_RAD)

Z_RIDGE_BEAM_TOP = 8500.0  # 軸3 大梁頂部高程 +8500

def z_beam_top(x):
    """計算任意 X 座標處的大梁上翼板頂面 Z 高程"""
    dx = abs(x - X_RIDGE)
    return Z_RIDGE_BEAM_TOP - dx * TAN_A

Z_COL_TOP = z_beam_top(0.0)  # 約 +7343.9 mm

# 輔助函式：將 Part.Shape 加入 DocumentObject 並設定顏色
def add_shape(parent_grp, name, shape, color=(0.7, 0.7, 0.7), transparency=0):
    obj = doc.addObject("Part::Feature", name)
    obj.Label = name
    obj.Shape = shape
    parent_grp.addObject(obj)
    if App.GuiUp:
        try:
            obj.ViewObject.ShapeColor = color
            obj.ViewObject.Transparency = transparency
        except Exception:
            pass
    return obj

# 建立 6 大 BIM 分層群組
grp_civil = doc.addObject("App::DocumentObjectGroup", "01_Civil_Foundation_Court")
grp_civil.Label = "01_土建基礎與籃球場"

grp_steel = doc.addObject("App::DocumentObjectGroup", "02_Primary_Steel_Structure")
grp_steel.Label = "02_主次鋼構與設備平台"

grp_roof = doc.addObject("App::DocumentObjectGroup", "03_Roof_Purlins_Sheet_Safety")
grp_roof.Label = "03_屋面C鋼_浪板_水槽_母索步道"

grp_pv = doc.addObject("App::DocumentObjectGroup", "04_Alu_Rails_PV_Modules_285pcs")
grp_pv.Label = "04_鋁擠支架與太陽能模組(285片)"

grp_mep_eq = doc.addObject("App::DocumentObjectGroup", "05_Inverters_Panels_MeterBox")
grp_mep_eq.Label = "05_逆變器與機電配電盤箱"

grp_mep_wire = doc.addObject("App::DocumentObjectGroup", "06_DC_AC_Cables_Trays_Conduits")
grp_mep_wire.Label = "06_全場DC串列線_AC幹線_鋁線槽與接地"

# ==============================================================================
# 型鋼斷面產生器 (真實 H型鋼 與 C型鋼 3D Extrusion)
# ==============================================================================
def make_h_profile_face(H, B, tw, tf):
    """在 XY 平面建立中心對齊 (0,0) 的 H 型鋼 2D Face (腹板沿 Y, 翼板沿 X)"""
    outer = Part.makePlane(B, H, App.Vector(-B/2.0, -H/2.0, 0))
    hole_w = (B - tw) / 2.0
    hole_h = H - 2.0 * tf
    left_hole = Part.makePlane(hole_w, hole_h, App.Vector(-B/2.0, -hole_h/2.0, 0))
    right_hole = Part.makePlane(hole_w, hole_h, App.Vector(tw/2.0, -hole_h/2.0, 0))
    return outer.cut(left_hole).cut(right_hole)

def make_h_beam_between(p1, p2, H, B, tw, tf):
    """在 p1 到 p2 之間建立真實 H 型鋼實體，高度方向 H 保持在垂直平面內"""
    v = p2.sub(p1)
    L = v.Length
    if L < 1e-3:
        return None
    face = make_h_profile_face(H, B, tw, tf)
    solid = face.extrude(App.Vector(0, 0, L))
    # 預設 extrude 沿 +Z，翼板寬沿 X，梁高 H 沿 Y
    # 計算旋轉矩陣：將 local Z 轉至 v_dir，local Y (梁高 H) 對齊世界 Z 軸投影
    z_axis = App.Vector(v).normalize()
    up = App.Vector(0, 0, 1)
    if abs(z_axis.dot(up)) > 0.999:
        # 垂直柱：H 朝向 X 軸 (東西向強軸)，B 朝向 Y 軸
        x_axis = App.Vector(0, 1, 0)
        y_axis = App.Vector(1, 0, 0)
    else:
        x_axis = up.cross(z_axis).normalize()
        y_axis = z_axis.cross(x_axis).normalize()
    m = App.Matrix(
        x_axis.x, y_axis.x, z_axis.x, p1.x,
        x_axis.y, y_axis.y, z_axis.y, p1.y,
        x_axis.z, y_axis.z, z_axis.z, p1.z,
        0, 0, 0, 1
    )
    return solid.transformGeometry(m)

# ==============================================================================
# 1. 土建基礎、柱底錨栓、防撞護墊與標準籃球場
# ==============================================================================
print("Building 01: Civil Foundation & Basketball Court...")

# 1.1 球場地坪與草地基底
court_slab = Part.makeBox(26000, 38000, 150, App.Vector(-2000, -3250, -150))
add_shape(grp_civil, "Court_Concrete_Slab", court_slab, (0.28, 0.45, 0.32))

# 標準籃球場線內區域 (28m x 15m, 置中於 X=11000, Y=15750)
play_area = Part.makeBox(15000, 28000, 10, App.Vector(3500, 1750, 0))
add_shape(grp_civil, "Basketball_Court_Floor", play_area, (0.65, 0.25, 0.20))

# 禁區與中場線標示
key_south = Part.makeBox(4900, 5800, 15, App.Vector(8550, 1750, 0))
key_north = Part.makeBox(4900, 5800, 15, App.Vector(8550, 23950, 0))
mid_line = Part.makeBox(15000, 80, 15, App.Vector(3500, 15710, 0))
add_shape(grp_civil, "Court_Markings_KeyAndLine", Part.makeCompound([key_south, key_north, mid_line]), (0.95, 0.95, 0.95))

# 2 座籃球架 (南北底線外)
hoop_shapes = []
for y_hoop, dir_y in [(1200.0, 1.0), (30300.0, -1.0)]:
    post = Part.makeBox(250, 250, 3200, App.Vector(10875, y_hoop - 125, 0))
    arm = Part.makeBox(200, 1200, 200, App.Vector(10900, y_hoop if dir_y > 0 else y_hoop - 1200, 2950))
    board = Part.makeBox(1800, 50, 1050, App.Vector(10100, y_hoop + dir_y * 1200, 2600))
    rim = Part.makeTorus(225, 15, App.Vector(11000, y_hoop + dir_y * 1450, 3050))
    hoop_shapes.extend([post, arm, board, rim])
add_shape(grp_civil, "Basketball_Hoops_2Sets", Part.makeCompound(hoop_shapes), (0.9, 0.9, 0.95))

# 1.2 縱向連續基礎地梁 (800x700mm, 開挖深度 -800mm ~ -100mm, 柱位處凸出柱墩至 +0)
fdn_shapes = []
baseplate_shapes = []
pad_shapes = []

for x_col in [0.0, 22000.0]:
    # 連續地梁 (Y = -800 ~ 32300, 寬 800, 高 700, Z = -800 ~ -100)
    gb = Part.makeBox(800, 33100, 700, App.Vector(x_col - 400, -800, -800))
    fdn_shapes.append(gb)
    for y_col in Y_AXES:
        # 柱墩 Pedestal (600x600x200, Z = -200 ~ 0)
        ped = Part.makeBox(600, 600, 200, App.Vector(x_col - 300, y_col - 300, -200))
        fdn_shapes.append(ped)
        # 柱底板 D1: PL20x500x500 (Z = 0 ~ 20)
        bp = Part.makeBox(500, 500, 20, App.Vector(x_col - 250, y_col - 250, 0))
        baseplate_shapes.append(bp)
        # 8-M20x170L 化學錨栓
        for bx in [-200, 0, 200]:
            for by in [-200, 0, 200]:
                if bx == 0 and by == 0:
                    continue
                bolt = Part.makeCylinder(12, 170, App.Vector(x_col + bx, y_col + by, -100))
                baseplate_shapes.append(bolt)
        # 柱底加勁板 D2: PL8x100x100 (8片)
        for sx in [-158, 150]:
            for sy in [-100, 92]:
                stiff = Part.makeBox(8, 100, 100, App.Vector(x_col + sx, y_col + sy - 50, 20))
                baseplate_shapes.append(stiff)
        # 鋼柱防護墊 (14座, 高 2000mm, 包覆於柱外側)
        pad_outer = Part.makeBox(460, 460, 2000, App.Vector(x_col - 230, y_col - 230, 20))
        pad_inner = Part.makeBox(320, 320, 2020, App.Vector(x_col - 160, y_col - 160, 10))
        pad_shapes.append(pad_outer.cut(pad_inner))

add_shape(grp_civil, "Continuous_GradeBeams_800x700", Part.makeCompound(fdn_shapes), (0.55, 0.55, 0.52))
add_shape(grp_civil, "Column_BasePlates_D1_D2_8M20", Part.makeCompound(baseplate_shapes), (0.35, 0.38, 0.42))
add_shape(grp_civil, "Column_SafetyPads_14pcs", Part.makeCompound(pad_shapes), (0.95, 0.78, 0.10))

# ==============================================================================
# 2. 主次鋼構系統 (Tekla 構件級建模)
# ==============================================================================
print("Building 02: Primary & Secondary Steel Structure...")

# 2.1 14支主鋼柱 SC1~SC7 (RH300x300x10x15, Z = 20 ~ Z_COL_TOP - 200)
col_shapes = []
col_top_z = Z_COL_TOP - 200.0  # 預留斜梁深度
for i_x, x_col in enumerate([0.0, 22000.0]):
    for i_y, y_col in enumerate(Y_AXES):
        p_bot = App.Vector(x_col, y_col, 20.0)
        p_top = App.Vector(x_col, y_col, col_top_z)
        col_solid = make_h_beam_between(p_bot, p_top, 300, 300, 10, 15)
        col_shapes.append(col_solid)
        # 柱頂斜板 D3: PL16x300x501.5
        cap = Part.makeBox(501.5, 300, 16, App.Vector(x_col - 250.75, y_col - 150, col_top_z))
        col_shapes.append(cap)

add_shape(grp_steel, "Columns_SC1_to_SC7_RH300x300_14pcs", Part.makeCompound(col_shapes), (0.45, 0.50, 0.55))

# 2.2 7榀東西向雙坡大梁 SG1~SG6 (RH400x200x8x13) + 14支斜隅加腋 H10 + 脊部接合板 D6/D7/D9
rafter_shapes = []
haunch_shapes = []
splice_shapes = []

for y_col in Y_AXES:
    # 西坡大梁 (SG2/SG4/SG5): X = -X_OVERHANG (-1000) ~ X_RIDGE (11000), 長約 12584mm
    # 中心線位於上翼板下方 200mm (H/2 = 200)
    p_w1 = App.Vector(-X_OVERHANG, y_col, z_beam_top(-X_OVERHANG) - 200.0)
    p_mid = App.Vector(X_RIDGE, y_col, z_beam_top(X_RIDGE) - 200.0)
    p_e2 = App.Vector(X_SPAN + X_OVERHANG, y_col, z_beam_top(X_SPAN + X_OVERHANG) - 200.0)

    rafter_w = make_h_beam_between(p_w1, p_mid, 400, 200, 8, 13)
    rafter_e = make_h_beam_between(p_mid, p_e2, 400, 200, 8, 13)
    rafter_shapes.extend([rafter_w, rafter_e])

    # 屋脊端板接合 (PL19x380x682, 16-M20x80L + 8-M20x70L)
    ridge_pl = Part.makeBox(38, 380, 682, App.Vector(X_RIDGE - 19, y_col - 190, Z_RIDGE_BEAM_TOP - 650))
    splice_shapes.append(ridge_pl)

    # 兩端梁柱斜隅加腋 H10 (長 2005.7mm, 高 200mm)
    p_hw1 = App.Vector(150.0, y_col, z_beam_top(150.0) - 480.0)
    p_hw2 = App.Vector(2150.0, y_col, z_beam_top(2150.0) - 280.0)
    haunch_w = make_h_beam_between(p_hw1, p_hw2, 200, 200, 8, 13)

    p_he1 = App.Vector(X_SPAN - 150.0, y_col, z_beam_top(X_SPAN - 150.0) - 480.0)
    p_he2 = App.Vector(X_SPAN - 2150.0, y_col, z_beam_top(X_SPAN - 2150.0) - 280.0)
    haunch_e = make_h_beam_between(p_he2, p_he1, 200, 200, 8, 13)
    haunch_shapes.extend([haunch_w, haunch_e])

add_shape(grp_steel, "Rafters_SG1_to_SG6_RH400x200_14pcs", Part.makeCompound(rafter_shapes), (0.40, 0.46, 0.52))
add_shape(grp_steel, "Haunches_H10_14pcs_and_RidgePlates", Part.makeCompound(haunch_shapes + splice_shapes), (0.35, 0.40, 0.45))

# 2.3 南北向主繫梁 E1~E4 (RH300x150x6.5x9, 共 18 支: 位於 X=0, 11000, 22000)
e_beam_shapes = []
for x_e in [0.0, 11000.0, 22000.0]:
    z_e = z_beam_top(x_e) - 150.0
    for i in range(len(Y_AXES) - 1):
        p1 = App.Vector(x_e, Y_AXES[i] + 150.0, z_e)
        p2 = App.Vector(x_e, Y_AXES[i+1] - 150.0, z_e)
        e_beam_shapes.append(make_h_beam_between(p1, p2, 300, 150, 6.5, 9))

add_shape(grp_steel, "TieBeams_E1_to_E4_RH300x150_18pcs", Part.makeCompound(e_beam_shapes), (0.48, 0.53, 0.58))

# 2.4 南北向次梁 CP1~CP4 (RH250x125x6x9, 共 24 支: 屋面軸2 X=5500, 軸4 X=16500 + 柱列下層 +6000mm X=0, 22000)
cp_beam_shapes = []
# 屋面次梁 CP1, CP2 (X=5500, 16500, 共 12 支)
for x_cp in [5500.0, 16500.0]:
    z_cp = z_beam_top(x_cp) - 125.0
    for i in range(len(Y_AXES) - 1):
        p1 = App.Vector(x_cp, Y_AXES[i] + 100.0, z_cp)
        p2 = App.Vector(x_cp, Y_AXES[i+1] - 100.0, z_cp)
        cp_beam_shapes.append(make_h_beam_between(p1, p2, 250, 125, 6, 9))

# 柱列下層抗風縱梁 CP3, CP4 (X=0, 22000, 標高 +6000mm, 共 12 支)
for x_cp in [0.0, 22000.0]:
    z_cp = 6000.0
    for i in range(len(Y_AXES) - 1):
        p1 = App.Vector(x_cp, Y_AXES[i] + 150.0, z_cp)
        p2 = App.Vector(x_cp, Y_AXES[i+1] - 150.0, z_cp)
        cp_beam_shapes.append(make_h_beam_between(p1, p2, 250, 125, 6, 9))

# 南北兩端懸挑端梁 RH150x75x5x7 (H19, H20, H21-1, H21-2)
for y_end in [Y_MIN_ROOF + 100.0, Y_MAX_ROOF - 100.0]:
    for x_seg in [(0.0, 11000.0), (11000.0, 22000.0)]:
        p1 = App.Vector(x_seg[0], y_end, z_beam_top(x_seg[0]) - 75.0)
        p2 = App.Vector(x_seg[1], y_end, z_beam_top(x_seg[1]) - 75.0)
        cp_beam_shapes.append(make_h_beam_between(p1, p2, 150, 75, 5, 7))

add_shape(grp_steel, "SubBeams_CP1_to_CP4_RH250x125_24pcs", Part.makeCompound(cp_beam_shapes), (0.52, 0.57, 0.62))

# 2.5 屋面交叉風拉桿 BK1, BK2 (Ø16 圓鋼 + 1/2" 伸縮器, 共 24 組 = 12 個交叉區間)
brace_shapes = []
# 配置於南北兩端跨 (G~F, B~A) 及中央跨 (E~D) 的 4 個 X 區間 (1~2, 2~3, 3~4, 4~5)，共 3 x 4 = 12 個交叉 = 24 支風拉桿
for y_idx in [0, 2, 5]:
    ya, yb = Y_AXES[y_idx], Y_AXES[y_idx + 1]
    for x_idx in range(4):
        xa, xb = X_AXES[x_idx], X_AXES[x_idx + 1]
        za = z_beam_top(xa) - 180.0
        zb = z_beam_top(xb) - 180.0
        pa1 = App.Vector(xa, ya, za)
        pb2 = App.Vector(xb, yb, zb)
        pa2 = App.Vector(xa, yb, za)
        pb1 = App.Vector(xb, ya, zb)
        v1 = pb2.sub(pa1)
        v2 = pb1.sub(pa2)
        rod1 = Part.makeCylinder(8, v1.Length, pa1, v1)
        rod2 = Part.makeCylinder(8, v2.Length, pa2, v2)
        brace_shapes.extend([rod1, rod2])

add_shape(grp_steel, "WindBracing_Rods_BK1_BK2_Ø16_24sets", Part.makeCompound(brace_shapes), (0.25, 0.30, 0.35))

# 2.6 設備平台結構 (軸5 X=22000 向內懸挑 1500mm [X=20500~22000], 軸B~A [Y=26500~31500], 標高 +4500mm)
plat_shapes = []
Z_PLAT = 4500.0
# 東西向懸挑托梁 F1(軸A Y=31500), F2(軸B Y=26500), F5(中梁 Y=29000) - RH150x75x5x7
for y_f in [26500.0, 29000.0, 31500.0]:
    p1 = App.Vector(20500.0, y_f, Z_PLAT - 75.0)
    p2 = App.Vector(22000.0, y_f, Z_PLAT - 75.0)
    plat_shapes.append(make_h_beam_between(p1, p2, 150, 75, 5, 7))
# 南北向平台縱梁 F3(X=20500), F4(X=22000) - RH150x75x5x7
for x_f in [20500.0, 21850.0]:
    p1 = App.Vector(x_f, 26500.0, Z_PLAT - 75.0)
    p2 = App.Vector(x_f, 31500.0, Z_PLAT - 75.0)
    plat_shapes.append(make_h_beam_between(p1, p2, 150, 75, 5, 7))
# 斜撐 BR1 (2支, RH150x75x5x7, 從 X=22000, Z=3018 斜撐至 X=20650, Z=4425)
for y_br in [26500.0, 31500.0]:
    p1 = App.Vector(22000.0, y_br, 3018.0)
    p2 = App.Vector(20650.0, y_br, Z_PLAT - 75.0)
    plat_shapes.append(make_h_beam_between(p1, p2, 150, 75, 5, 7))
# 平台 C型鋼 PP4 (4支 C150x50x20x3.2) 與 花紋鋼板 D21/D22 (PL3.2x1688x2532.5 x 2片)
for x_pp4 in [20750.0, 21100.0, 21450.0, 21800.0]:
    c_bar = Part.makeBox(50, 5000, 150, App.Vector(x_pp4 - 25, 26500.0, Z_PLAT))
    plat_shapes.append(c_bar)
deck_plate = Part.makeBox(1688, 5065, 10, App.Vector(20400.0, 26467.5, Z_PLAT + 150.0))
plat_shapes.append(deck_plate)
# 平台四周安全欄杆與設備背架 C型鋼 (高至 +6000mm)
for y_p in [26500.0, 29000.0, 31500.0]:
    post = Part.makeBox(50, 50, 1400, App.Vector(20420.0, y_p - 25, Z_PLAT + 160.0))
    plat_shapes.append(post)
for z_rail in [Z_PLAT + 700.0, Z_PLAT + 1200.0, Z_PLAT + 1500.0]:
    rail_front = Part.makeBox(40, 5000, 40, App.Vector(20420.0, 26500.0, z_rail))
    rail_back = Part.makeBox(50, 5000, 100, App.Vector(21800.0, 26500.0, z_rail))
    plat_shapes.extend([rail_front, rail_back])

add_shape(grp_steel, "Equipment_Platform_Axis5_AB_EL4500", Part.makeCompound(plat_shapes), (0.35, 0.42, 0.50))

# 2.7 西南角護籠爬梯 (軸1/G, X=-500, Y=0)
ladder_shapes = []
lx, ly = -450.0, 0.0
z_lad_top = z_beam_top(-450.0) + 200.0
rail_l = Part.makeCylinder(25, z_lad_top, App.Vector(lx, ly - 300, 0))
rail_r = Part.makeCylinder(25, z_lad_top, App.Vector(lx, ly + 300, 0))
ladder_shapes.extend([rail_l, rail_r])
for z_rung in range(300, int(z_lad_top), 300):
    rung = Part.makeCylinder(12, 600, App.Vector(lx, ly - 300, z_rung), App.Vector(0, 1, 0))
    ladder_shapes.append(rung)
# 護籠圓環 (Z = 2200 ~ z_lad_top)
for z_hoop in range(2200, int(z_lad_top), 750):
    hoop_o = Part.makeCylinder(400, 40, App.Vector(lx - 350, ly, z_hoop))
    hoop_i = Part.makeCylinder(360, 50, App.Vector(lx - 350, ly, z_hoop - 5))
    ladder_shapes.append(hoop_o.cut(hoop_i))
for ang in [-60, -30, 0, 30, 60]:
    rad = math.radians(ang)
    vx = lx - 350 - 380 * math.cos(rad)
    vy = ly + 380 * math.sin(rad)
    v_strip = Part.makeBox(15, 40, z_lad_top - 2200, App.Vector(vx, vy - 20, 2200))
    ladder_shapes.append(v_strip)

add_shape(grp_steel, "Safety_Cage_Ladder_Axis1_G", Part.makeCompound(ladder_shapes), (0.90, 0.65, 0.10))

# ==============================================================================
# 3. 屋面 C型鋼 (22排)、清浪板、中脊板、白鐵水槽、維修步道與安全母索
# ==============================================================================
print("Building 03: Roof Purlins, Corrugated Sheets, Gutters & Safety Lifeline...")

# 3.1 屋面 C型鋼 PP1~PP3 (C150x50x20x3.2, 東西坡各 11 排 = 共 22 排, 全長 Y = -2395 ~ 33895)
purlin_shapes = []
Y_PURLIN_LEN = Y_MAX_ROOF - Y_MIN_ROOF

# 西坡 11 排 X 座標 (-900 ~ 10550) 與 東坡 11 排 X 座標 (11450 ~ 22900)
west_purlin_x = [-900.0 + i * 1145.0 for i in range(11)]
east_purlin_x = [11450.0 + i * 1145.0 for i in range(11)]
all_purlin_x = west_purlin_x + east_purlin_x

for px in all_purlin_x:
    pz = z_beam_top(px)
    # 建立 C150x50 斷面並擠出全長
    c_outer = Part.makeBox(50, Y_PURLIN_LEN, 150, App.Vector(px - 25, Y_MIN_ROOF, pz))
    c_inner = Part.makeBox(44, Y_PURLIN_LEN + 20, 140, App.Vector(px - 19, Y_MIN_ROOF - 10, pz + 5))
    purlin_shapes.append(c_outer.cut(c_inner))

add_shape(grp_roof, "Roof_Purlins_PP1_to_PP3_C150x50_22Rows", Part.makeCompound(purlin_shapes), (0.60, 0.65, 0.70))

# 3.2 蓋清浪板 (0.6mm 清板, 位於 C型鋼頂面 Z = z_beam_top(x) + 150) + 屋脊中脊板
Z_ROOF_OFFSET = 150.0  # C型鋼高度 150mm
SHEET_THICK = 25.0     # 浪板波高示意 25mm

# 西坡浪板 (-1000 ~ 11000)
p_sw1 = App.Vector(-X_OVERHANG, Y_MIN_ROOF, z_beam_top(-X_OVERHANG) + Z_ROOF_OFFSET)
p_sw2 = App.Vector(X_RIDGE, Y_MIN_ROOF, z_beam_top(X_RIDGE) + Z_ROOF_OFFSET)
p_sw3 = App.Vector(X_RIDGE, Y_MIN_ROOF, z_beam_top(X_RIDGE) + Z_ROOF_OFFSET + SHEET_THICK)
p_sw4 = App.Vector(-X_OVERHANG, Y_MIN_ROOF, z_beam_top(-X_OVERHANG) + Z_ROOF_OFFSET + SHEET_THICK)
wire_w = Part.makePolygon([p_sw1, p_sw2, p_sw3, p_sw4, p_sw1])
sheet_west = Part.Face(wire_w).extrude(App.Vector(0, Y_PURLIN_LEN, 0))

# 東坡浪板 (11000 ~ 23000)
p_se1 = App.Vector(X_RIDGE, Y_MIN_ROOF, z_beam_top(X_RIDGE) + Z_ROOF_OFFSET)
p_se2 = App.Vector(X_SPAN + X_OVERHANG, Y_MIN_ROOF, z_beam_top(X_SPAN + X_OVERHANG) + Z_ROOF_OFFSET)
p_se3 = App.Vector(X_SPAN + X_OVERHANG, Y_MIN_ROOF, z_beam_top(X_SPAN + X_OVERHANG) + Z_ROOF_OFFSET + SHEET_THICK)
p_se4 = App.Vector(X_RIDGE, Y_MIN_ROOF, z_beam_top(X_RIDGE) + Z_ROOF_OFFSET + SHEET_THICK)
wire_e = Part.makePolygon([p_se1, p_se2, p_se3, p_se4, p_se1])
sheet_east = Part.Face(wire_e).extrude(App.Vector(0, Y_PURLIN_LEN, 0))

# 屋脊中脊板 (寬 600mm, X = 10700 ~ 11300)
ridge_cap = Part.makeBox(600, Y_PURLIN_LEN, 20, App.Vector(X_RIDGE - 300, Y_MIN_ROOF, Z_RIDGE_BEAM_TOP + Z_ROOF_OFFSET + SHEET_THICK))

add_shape(grp_roof, "Corrugated_Roof_Sheets_0_6mm_241Ping", Part.makeCompound([sheet_west, sheet_east]), (0.82, 0.88, 0.92), transparency=35)
add_shape(grp_roof, "Ridge_Flashing_Cap", ridge_cap, (0.70, 0.75, 0.80))

# 3.3 東西兩側 30cm 白鐵排水水槽 (231.75呎) 與落水管
gutter_shapes = []
for gx, dir_x in [(-X_OVERHANG - 150.0, -1), (X_SPAN + X_OVERHANG - 150.0, 1)]:
    gz = z_beam_top(-X_OVERHANG) + Z_ROOF_OFFSET - 120.0
    g_outer = Part.makeBox(300, Y_PURLIN_LEN, 200, App.Vector(gx, Y_MIN_ROOF, gz))
    g_inner = Part.makeBox(280, Y_PURLIN_LEN - 20, 195, App.Vector(gx + 10, Y_MIN_ROOF + 10, gz + 10))
    gutter_shapes.append(g_outer.cut(g_inner))

add_shape(grp_roof, "Stainless_Steel_Gutters_30cm", Part.makeCompound(gutter_shapes), (0.75, 0.78, 0.82))

# 3.4 維修步道 (角鐵框 + 菱形擴張網, 60.8m: 沿屋脊中央 X=11000 及 南端 Y=-1800)
walkway_shapes = []
# 中央屋脊南北向維修步道 (寬 600mm, Y = -2000 ~ 33500)
catwalk_ridge = Part.makeBox(600, Y_PURLIN_LEN - 400, 30, App.Vector(X_RIDGE - 300, Y_MIN_ROOF + 200, Z_RIDGE_BEAM_TOP + Z_ROOF_OFFSET + SHEET_THICK + 25))
walkway_shapes.append(catwalk_ridge)
# 南端東西向聯絡步道 (自爬梯口 X=-450 至東側 X=22500, Y=-2000, 寬 600mm)
for wx in range(-500, 22500, 500):
    wz = z_beam_top(wx) + Z_ROOF_OFFSET + SHEET_THICK + 30
    step_plank = Part.makeBox(480, 600, 25, App.Vector(wx, Y_MIN_ROOF + 100, wz))
    walkway_shapes.append(step_plank)

add_shape(grp_roof, "Maintenance_Catwalk_ExpandedMetal_60_8m", Part.makeCompound(walkway_shapes), (0.45, 0.45, 0.48))

# 3.5 屋面四周安全母索立柱 (角鐵高 1m, 斜撐 50cm, 間距 2.5m) 與雙層不鏽鋼母索 (115.8m)
lifeline_posts = []
lifeline_cables = []

# 南北兩側邊緣立柱 (X = -800, X = 22800, Y 每 2500mm 一支)
y_posts = [Y_MIN_ROOF + 200.0 + i * 2400.0 for i in range(16)]
for px in [-800.0, 22800.0]:
    pz_base = z_beam_top(px) + Z_ROOF_OFFSET + SHEET_THICK
    for py in y_posts:
        post = Part.makeBox(40, 40, 1000, App.Vector(px - 20, py - 20, pz_base))
        brace = Part.makeBox(30, 350, 30, App.Vector(px - 15, py, pz_base + 250))
        lifeline_posts.extend([post, brace])
    # 雙層母索 (高 500mm 與 1000mm)
    for dh in [500.0, 980.0]:
        cable = Part.makeCylinder(6, y_posts[-1] - y_posts[0], App.Vector(px, y_posts[0], pz_base + dh), App.Vector(0, 1, 0))
        lifeline_cables.append(cable)

# 東西向南北端頭立柱 (Y = Y_MIN_ROOF+200, Y = Y_MAX_ROOF-200, X 每 2500mm 一支)
x_posts = [-800.0 + i * 2360.0 for i in range(11)]
for py in [Y_MIN_ROOF + 200.0, Y_MAX_ROOF - 200.0]:
    for i_p, px in enumerate(x_posts):
        pz_base = z_beam_top(px) + Z_ROOF_OFFSET + SHEET_THICK
        post = Part.makeBox(40, 40, 1000, App.Vector(px - 20, py - 20, pz_base))
        lifeline_posts.append(post)
        if i_p < len(x_posts) - 1:
            nx = x_posts[i_p + 1]
            npz_base = z_beam_top(nx) + Z_ROOF_OFFSET + SHEET_THICK
            for dh in [500.0, 980.0]:
                p1 = App.Vector(px, py, pz_base + dh)
                p2 = App.Vector(nx, py, npz_base + dh)
                v = p2.sub(p1)
                lifeline_cables.append(Part.makeCylinder(6, v.Length, p1, v))

add_shape(grp_roof, "Safety_Lifeline_Posts_and_Cables_115_8m", Part.makeCompound(lifeline_posts + lifeline_cables), (0.85, 0.25, 0.15))

# ==============================================================================
# 4. 鋁擠支架 (40x40側開, h腳座 + 屋脊L腳座) 與 285片太陽能模組 (同昱 550Wp)
# ==============================================================================
print("Building 04: Aluminum Rails (h-feet & Ridge L-feet) and 285 PV Modules...")

# 同昱 GTEC-550G9B6C 模組尺寸: 長 2278 x 寬 1134 x 厚 35 mm
# 排佈規則:
# 全場共 285 片 = 19 排 (沿 Y 軸南北向) x 15 列 (沿 X 軸東西向: 東坡 A區 8列 + 西坡 B區 7列 = 15列; 19 x 15 = 285片!)
# (註: 鋁支架分料單 150+135=285片，圖面上以 19排 x 15列 完美對齊 285片)
MOD_W_X = 1380.0   # 沿 X 斜坡方向寬度 (含壓塊間距)
MOD_L_Y = 1780.0   # 沿 Y 南北方向節距 (19排 x 1780 = 33820mm, 涵蓋 Y = -1100 ~ 32720)
MOD_THICK = 35.0

# 西坡 B區 (7列模組, X = -400 ~ 9400)
west_col_x = [-350.0 + c * 1420.0 for c in range(7)]
# 東坡 A區 (8列模組, X = 11500 ~ 21600)
east_col_x = [11550.0 + c * 1420.0 for c in range(8)]
all_mod_cols_x = west_col_x + east_col_x  # 共 15 列

# 南北向 19 排 Y 座標 (由北而南 r=0..18, 對應圖面串列編號)
row_y_centers = [32000.0 - r * 1800.0 for r in range(19)]

rail_shapes = []
h_foot_shapes = []
l_foot_shapes = []

# 鋁擠型支架 (40x40mm, 沿 X 坡面方向架設，每排模組下方 3 支橫軌 = 19排 x 2坡 x 2~3軌 -> 分料單 A區45支 + B區45支 = 90支)
for r_idx, ry in enumerate(row_y_centers):
    for sub_y in [-450.0, 450.0]:
        y_rail = ry + sub_y
        # 西坡鋁軌 (X = -500 ~ 9800)
        pw1 = App.Vector(-500.0, y_rail - 20.0, z_beam_top(-500.0) + Z_ROOF_OFFSET + SHEET_THICK + 120.0)
        pw2 = App.Vector(9800.0, y_rail - 20.0, z_beam_top(9800.0) + Z_ROOF_OFFSET + SHEET_THICK + 120.0)
        vw = pw2.sub(pw1)
        rail_w = Part.makeBox(40, 40, vw.Length)
        # 對齊斜坡
        rail_shapes.append(Part.makeCylinder(20, vw.Length, pw1, vw))

        # 東坡鋁軌 (X = 11400 ~ 22800)
        pe1 = App.Vector(11400.0, y_rail - 20.0, z_beam_top(11400.0) + Z_ROOF_OFFSET + SHEET_THICK + 120.0)
        pe2 = App.Vector(22800.0, y_rail - 20.0, z_beam_top(22800.0) + Z_ROOF_OFFSET + SHEET_THICK + 120.0)
        ve = pe2.sub(pe1)
        rail_shapes.append(Part.makeCylinder(20, ve.Length, pe1, ve))

    # 腳座: 靠近屋脊 (X=9800, 11400) 採用 L 型腳座 (90只)，其餘浪板波峰採用 h 型腳座
    for lx in [9750.0, 11450.0]:
        lz = z_beam_top(lx) + Z_ROOF_OFFSET + SHEET_THICK
        l_foot_shapes.append(Part.makeBox(60, 80, 130, App.Vector(lx - 30, ry - 40, lz)))
    for hx in [-300.0, 3000.0, 6300.0, 14500.0, 18000.0, 21500.0]:
        hz = z_beam_top(hx) + Z_ROOF_OFFSET + SHEET_THICK
        h_foot_shapes.append(Part.makeBox(80, 60, 130, App.Vector(hx - 40, ry - 30, hz)))

add_shape(grp_pv, "Aluminum_Rails_40x40_SideOpen_90pcs", Part.makeCompound(rail_shapes), (0.78, 0.80, 0.83))
add_shape(grp_pv, "Mount_h_Feet_1125pcs_on_CorrugatedSheet", Part.makeCompound(h_foot_shapes), (0.65, 0.68, 0.72))
add_shape(grp_pv, "Mount_L_Feet_90pcs_on_RidgeCap", Part.makeCompound(l_foot_shapes), (0.95, 0.45, 0.15))

# 285 片太陽能模組建置，同時記錄每片模組的底部接線盒座標供第 6 步串列接線使用
pv_frame_shapes = []
pv_cell_shapes = []
module_centers = {}  # (col_idx 0..14, row_idx 0..18) -> App.Vector (J-Box center)

for c_idx, cx in enumerate(all_mod_cols_x):
    is_west = (cx < X_RIDGE)
    tilt_deg = ROOF_ANGLE_DEG if is_west else -ROOF_ANGLE_DEG
    cz_base = z_beam_top(cx) + Z_ROOF_OFFSET + SHEET_THICK + 145.0

    for r_idx, ry in enumerate(row_y_centers):
        # 建立單片模組 (寬 1340 x 長 1720 x 厚 35)
        mod_box = Part.makeBox(1340, 1720, MOD_THICK, App.Vector(-670, -860, 0))
        cell_sheet = Part.makeBox(1280, 1660, 6, App.Vector(-640, -830, MOD_THICK - 4))

        rot = App.Rotation(App.Vector(0, 1, 0), -tilt_deg)
        pos = App.Vector(cx, ry, cz_base)
        plm = App.Placement(pos, rot)

        mod_box.Placement = plm
        cell_sheet.Placement = plm

        pv_frame_shapes.append(mod_box)
        pv_cell_shapes.append(cell_sheet)

        module_centers[(c_idx, r_idx)] = App.Vector(cx, ry, cz_base - 15.0)

add_shape(grp_pv, "PV_Modules_Frames_285pcs", Part.makeCompound(pv_frame_shapes), (0.75, 0.78, 0.80))
add_shape(grp_pv, "PV_Modules_GTEC_550G9B6C_285pcs_156_75kWp", Part.makeCompound(pv_cell_shapes), (0.08, 0.16, 0.36))

# ==============================================================================
# 5. 逆變器 (INV-1 110kW, INV-2 30kW)、DC/AC 配電箱、監控箱與 1F 台電 CT 電表箱
# ==============================================================================
print("Building 05: Inverters, DC/AC Panels, Monitoring Box & Taipower CT Meter Box...")

Z_EQ_BASE = Z_PLAT + 160.0  # 設備平台花紋板頂面 +4660mm

# 5.1 INV-1: 新望 PrimeVOLT PV-110KH-U (110kW, 尺寸約 1050 x 660 x 330 mm, 掛載於 Y=29600)
inv1_body = Part.makeBox(350, 1050, 680, App.Vector(21450.0, 29100.0, Z_EQ_BASE + 500.0))
inv1_screen = Part.makeBox(360, 350, 220, App.Vector(21445.0, 29450.0, Z_EQ_BASE + 780.0))
add_shape(grp_mep_eq, "INV1_PrimeVOLT_PV_110KH_U_110kW", inv1_body, (0.85, 0.15, 0.18))
add_shape(grp_mep_eq, "INV1_Display_Panel", inv1_screen, (0.12, 0.12, 0.15))

# 5.2 INV-2: 新望 PrimeVOLT PV-30000H-U (30kW, 尺寸約 650 x 520 x 260 mm, 掛載於 Y=27900)
inv2_body = Part.makeBox(280, 650, 540, App.Vector(21520.0, 27600.0, Z_EQ_BASE + 550.0))
inv2_screen = Part.makeBox(290, 240, 160, App.Vector(21515.0, 27805.0, Z_EQ_BASE + 760.0))
add_shape(grp_mep_eq, "INV2_PrimeVOLT_PV_30000H_U_30kW", inv2_body, (0.85, 0.15, 0.18))
add_shape(grp_mep_eq, "INV2_Display_Panel", inv2_screen, (0.12, 0.12, 0.15))

# 5.3 DC-1 箱 (14迴路 20A 1000V Fuse, Y=30600) 與 DC-2 箱 (3迴路, Y=27000)
dc1_box = Part.makeBox(250, 650, 800, App.Vector(21550.0, 30350.0, Z_EQ_BASE + 450.0))
dc2_box = Part.makeBox(250, 450, 600, App.Vector(21550.0, 26950.0, Z_EQ_BASE + 550.0))
add_shape(grp_mep_eq, "DC1_CombinerBox_14Strings", dc1_box, (0.35, 0.38, 0.35))
add_shape(grp_mep_eq, "DC2_CombinerBox_3Strings", dc2_box, (0.35, 0.38, 0.35))

# 5.4 AC-1 交流配電盤 (3P4W 220/380V, 內含 NFB 400AF/300AT, 250AF, 100AF, 位於平台前側 Y=28600)
ac1_box = Part.makeBox(320, 750, 1000, App.Vector(20460.0, 28200.0, Z_EQ_BASE + 300.0))
add_shape(grp_mep_eq, "AC1_MainPanel_3P4W_300AT", ac1_box, (0.30, 0.33, 0.30))

# 5.5 監控箱 (含照度計/溫度計顯示器 ID:31, ID:32, 位於平台前側 Y=30200) 與屋頂日照計
mon_box = Part.makeBox(250, 500, 600, App.Vector(20460.0, 29900.0, Z_EQ_BASE + 450.0))
pyranometer = Part.makeCylinder(60, 120, App.Vector(22200.0, 31500.0, z_beam_top(22200.0) + 350.0))
add_shape(grp_mep_eq, "Monitoring_Box_and_Pyranometer", Part.makeCompound([mon_box, pyranometer]), (0.25, 0.30, 0.35))

# 5.6 1F 新設 3Φ4W 低壓附 CT 使用式電錶箱 (KWH-PV 寬750 + 受電箱 寬600 = 總寬1350 x 高2150 x 深500 mm, SUS304 2.0t)
# 設置於東北側地面責任分界點 (X=25000, Y=31500)
meter_pedestal = Part.makeBox(600, 1450, 150, App.Vector(24700.0, 30775.0, 0.0))
kwh_box = Part.makeBox(500, 750, 2000, App.Vector(24750.0, 30825.0, 150.0))
rec_box = Part.makeBox(500, 600, 2000, App.Vector(24750.0, 31575.0, 150.0))
ct_window = Part.makeBox(520, 250, 200, App.Vector(24740.0, 31075.0, 1550.0))
add_shape(grp_mep_eq, "Taipower_3P4W_CT_MeterBox_and_ReceivingBox_1350x2150", Part.makeCompound([meter_pedestal, kwh_box, rec_box]), (0.32, 0.35, 0.32))
add_shape(grp_mep_eq, "Taipower_KWH_Meter_Window_x80CT", ct_window, (0.85, 0.20, 0.20))

# ==============================================================================
# 6. 全場 DC 串列線路 (17串 x 285片)、#A/#B 鋁線槽、#C/#D RSG金屬管幹線與接地系統
# ==============================================================================
print("Building 06: DC String Wiring (17 Strings), Cable Trays (#A/#B), AC Conduits (#C/#D) & Grounding...")

# 6.1 定義 17 串太陽能模組分配 (嚴格對應施工圖 E21/DC單線圖/串併圖，總計 285 片):
# INV-1 (225片, 14串):
#   MPPT1: 1-1(16片), 1-2(16片)
#   MPPT2: 1-3(16片), 1-4(16片)
#   MPPT3: 1-5(16片), 1-6(16片)
#   MPPT4: 1-7(16片)
#   MPPT5: 1-8(12片-東遮陰)
#   MPPT6: 1-9(11片-東遮陰)
#   MPPT7: 1-10(18片), 1-11(18片)
#   MPPT8: 1-12(18片), 1-13(18片)
#   MPPT9: 1-14(18片)
# INV-2 (60片, 3串):
#   MPPT1: 2-1(18片), 2-2(18片)
#   MPPT2: 2-3(12片-西遮陰), 2-4(12片-西遮陰) -> 合為4串共60片

# 按順序將 285 個 (c_idx, r_idx) 座標分配給各串列
ordered_modules = []
# 東坡 8 列 (c_idx = 7..14), 19 排 = 152 片
for r in range(19):
    cols = range(7, 15) if r % 2 == 0 else range(14, 6, -1)
    for c in cols:
        ordered_modules.append((c, r))
# 西坡 7 列 (c_idx = 6..0), 19 排 = 133 片
for r in range(19):
    cols = range(6, -1, -1) if r % 2 == 0 else range(0, 7)
    for c in cols:
        ordered_modules.append((c, r))

string_specs = [
    ("1-1", 16, "INV1"), ("1-2", 16, "INV1"),
    ("1-3", 16, "INV1"), ("1-4", 16, "INV1"),
    ("1-5", 16, "INV1"), ("1-6", 16, "INV1"),
    ("1-7", 16, "INV1"), ("1-8_Shade", 12, "INV1"), ("1-9_Shade", 11, "INV1"),
    ("1-10", 18, "INV1"), ("1-11", 18, "INV1"),
    ("1-12", 18, "INV1"), ("1-13", 18, "INV1"),
    ("1-14", 18, "INV1"),
    ("2-1", 18, "INV2"), ("2-2", 18, "INV2"),
    ("2-3_Shade", 12, "INV2"), ("2-4_Shade", 12, "INV2")
]

dc_pos_wires = []  # 紅色正極串列線與回幹線
dc_neg_wires = []  # 黑色負極串列線與回幹線

idx_ptr = 0
for s_name, s_count, inv_target in string_specs:
    s_mods = ordered_modules[idx_ptr : idx_ptr + s_count]
    idx_ptr += s_count

    # 串列內部模組正負極串接線 (紅線)
    for k in range(len(s_mods) - 1):
        p_a = module_centers[s_mods[k]]
        p_b = module_centers[s_mods[k+1]]
        v = p_b.sub(p_a)
        if v.Length > 1.0:
            dc_pos_wires.append(Part.makeCylinder(8, v.Length, p_a, v))

    # 串列首端 (+極, 紅線) 與 末端 (-極, 黑線) 引線匯入中央屋脊 #A 鋁線槽 (X = 11000)
    p_first = module_centers[s_mods[0]]
    p_tray_first = App.Vector(X_RIDGE - 40.0, p_first.y, Z_RIDGE_BEAM_TOP + 160.0)
    vf = p_tray_first.sub(p_first)
    if vf.Length > 1.0:
        dc_pos_wires.append(Part.makeCylinder(7, vf.Length, p_first, vf))

    p_last = module_centers[s_mods[-1]]
    p_tray_last = App.Vector(X_RIDGE + 40.0, p_last.y, Z_RIDGE_BEAM_TOP + 160.0)
    vl = p_tray_last.sub(p_last)
    if vl.Length > 1.0:
        dc_neg_wires.append(Part.makeCylinder(7, vl.Length, p_last, vl))

add_shape(grp_mep_wire, "DC_PV_Cable_4mm2_Positive_Red_Strings", Part.makeCompound(dc_pos_wires), (0.92, 0.15, 0.15))
add_shape(grp_mep_wire, "DC_PV_Cable_4mm2_Negative_Black_Strings", Part.makeCompound(dc_neg_wires), (0.18, 0.18, 0.20))

# 6.2 (#A-幹線) 100x100mm 鋁線槽 (沿屋脊中央 Y=-1100~31500，再於北端軸A Y=31500 往東折向軸5 X=22000，並垂直下引至 +4500 設備平台)
tray_a_shapes = []
# 屋脊南北向主線槽 (100x100mm)
tray_a_ridge = Part.makeBox(100, 32600, 100, App.Vector(X_RIDGE - 50.0, -1100.0, Z_RIDGE_BEAM_TOP + 120.0))
tray_a_shapes.append(tray_a_ridge)

# 北端軸A (Y=31500) 東西向橫越線槽 (X=11000 -> 21650)
p_ta1 = App.Vector(X_RIDGE, 31500.0, z_beam_top(X_RIDGE) + 120.0)
p_ta2 = App.Vector(21650.0, 31500.0, z_beam_top(21650.0) + 120.0)
v_ta = p_ta2.sub(p_ta1)
tray_a_east = Part.makeCylinder(55, v_ta.Length, p_ta1, v_ta)
tray_a_shapes.append(tray_a_east)

# 沿軸 5/A 鋼柱垂直下引至設備平台 DC-1 / DC-2 的 100x100 鋁線槽
z_top_5a = z_beam_top(21650.0) + 120.0
tray_a_drop = Part.makeBox(100, 100, z_top_5a - (Z_EQ_BASE + 800.0), App.Vector(21600.0, 31300.0, Z_EQ_BASE + 800.0))
tray_a_horiz = Part.makeBox(100, 4600, 100, App.Vector(21600.0, 26800.0, Z_EQ_BASE + 1250.0))
tray_a_shapes.extend([tray_a_drop, tray_a_horiz])

# DC-1 / DC-2 進 INV-1 / INV-2 之 Ø31mm 金屬軟管與 DC 幹線
for y_drop in [30600.0, 29800.0, 29400.0, 28000.0, 27200.0]:
    flex = Part.makeCylinder(18, 450, App.Vector(21650.0, y_drop, Z_EQ_BASE + 800.0))
    tray_a_shapes.append(flex)

add_shape(grp_mep_wire, "CableTray_A_100x100_AluDuct_DC_Main_Fill_15_96pct", Part.makeCompound(tray_a_shapes), (0.72, 0.76, 0.80))

# 6.3 (#B-分路) 100x100mm AC 鋁線槽 (連接 INV-1 [XLPE 100mm²x4+E22] 與 INV-2 [XLPE 14mm²x4+E5.5] 至 AC-1 配電盤)
tray_b_shapes = []
tray_b_back = Part.makeBox(100, 3000, 100, App.Vector(21500.0, 27500.0, Z_EQ_BASE + 300.0))
tray_b_cross = Part.makeBox(1150, 100, 100, App.Vector(20460.0, 28550.0, Z_EQ_BASE + 300.0))
tray_b_shapes.extend([tray_b_back, tray_b_cross])
add_shape(grp_mep_wire, "CableTray_B_100x100_AluDuct_AC_Branch_Fill_12_66pct", Part.makeCompound(tray_b_shapes), (0.60, 0.72, 0.85))

# 6.4 (#C & #D) Ø82mm (3") RSG 金屬管 x 2 管 (內穿 XLPE 60mm²-1/Cx4, E22 x 2迴)
# 路徑: AC-1 盤 -> 平台下方 -> 沿 SC7 (軸5/A) 鋼柱垂直下地 -> 埋地至 1F KWH-PV 電表箱 (#C) -> 受電箱 (#D)
conduit_cd_shapes = []
for offset_y in [-60.0, 60.0]:
    # 平台橫越段 (X=20600 -> 22180, Y=28500+offset_y)
    c_h1 = Part.makeCylinder(41, 1580, App.Vector(20600.0, 28500.0 + offset_y, Z_EQ_BASE + 200.0), App.Vector(1, 0, 0))
    # 往北沿軸5走至 SC7 柱 (Y=28500 -> 31300)
    c_h2 = Part.makeCylinder(41, 2800, App.Vector(22180.0, 28500.0 + offset_y, Z_EQ_BASE + 200.0), App.Vector(0, 1, 0))
    # 沿 SC7 鋼柱垂直下引至地面下 -400mm
    c_v1 = Part.makeCylinder(41, Z_EQ_BASE + 600.0, App.Vector(22180.0, 31300.0 + offset_y, -400.0))
    # 地下埋管至 KWH-PV 電表箱 (X=22180 -> 25000)
    c_ug = Part.makeCylinder(41, 2820, App.Vector(22180.0, 31300.0 + offset_y, -400.0), App.Vector(1, 0, 0))
    # 上引進 KWH-PV 表箱 (#C) 與 受電箱 (#D)
    c_up1 = Part.makeCylinder(41, 600, App.Vector(25000.0, 31100.0 + offset_y, -400.0))
    c_up2 = Part.makeCylinder(41, 600, App.Vector(25000.0, 31800.0 + offset_y, -400.0))
    conduit_cd_shapes.extend([c_h1, c_h2, c_v1, c_ug, c_up1, c_up2])

add_shape(grp_mep_wire, "Conduit_C_and_D_Ø82mm_RSG_x2_XLPE_60mm2_2Circuits", Part.makeCompound(conduit_cd_shapes), (0.95, 0.55, 0.15))

# 6.5 設備接地 (E22, R<10Ω) 與 系統接地 (E30, R<50Ω) 綠色接地幹線及接地銅棒
gnd_shapes = []
# 屋頂四周與中央 E22 設備接地母線
gnd_roof = Part.makeCylinder(10, 32600, App.Vector(X_RIDGE + 80.0, -1100.0, Z_RIDGE_BEAM_TOP + 140.0), App.Vector(0, 1, 0))
# 沿軸5/A 下引至設備接地極 (X=22350, Y=31650)
gnd_drop = Part.makeCylinder(10, z_beam_top(22000.0) + 400.0, App.Vector(22250.0, 31550.0, -300.0))
# 設備接地銅棒 3支 (R<10Ω) 與 系統接地銅棒 3支 (R<50Ω, 位於電表箱旁 X=25400)
for gx_base in [22250.0, 25400.0]:
    for gy_off in [-300.0, 0.0, 300.0]:
        rod = Part.makeCylinder(15, 1200, App.Vector(gx_base, 31550.0 + gy_off, -1200.0))
        gnd_shapes.append(rod)
    bar = Part.makeCylinder(10, 600, App.Vector(gx_base, 31250.0, -200.0), App.Vector(0, 1, 0))
    gnd_shapes.append(bar)
gnd_shapes.extend([gnd_roof, gnd_drop])

add_shape(grp_mep_wire, "Grounding_System_E22_10Ohm_and_E30_50Ohm", Part.makeCompound(gnd_shapes), (0.15, 0.78, 0.25))

# ==============================================================================
# 7. 重新計算並輸出 .FCStd 與 .STEP 檔案
# ==============================================================================
doc.recompute()

fcstd_path = os.path.join(OUT_DIR, "[案號]-[案名]-風雨球場3D全模型.FCStd")
step_path = os.path.join(OUT_DIR, "[案號]-[案名]-風雨球場3D全模型.step")

doc.saveAs(fcstd_path)
print("Saved FreeCAD document:", fcstd_path)

all_features = [o for o in doc.Objects if o.TypeId == "Part::Feature"]
Part.export(all_features, step_path)
print("Exported STEP file:", step_path)
print("Total 3D BIM objects created:", len(all_features))

if App.GuiUp:
    import FreeCADGui as Gui
    try:
        Gui.SendMsgToMainWindow("ViewFit")
        v = Gui.activeDocument().activeView()
        if v:
            v.viewIsometric()
            v.fitAll()
        doc.saveAs(fcstd_path)
    except Exception as e:
        print("GUI setup:", e)
