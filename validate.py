"""
Validate calc engine formulas against exact Excel expectations.
This tests the MATH only — same formulas as the JS modules.
"""
import math, sys

passed = failed = 0

def assert_eq(label, actual, expected, tol=0.01):
    global passed, failed
    diff = abs(actual - expected)
    if diff <= tol:
        passed += 1
        print(f"  OK {label}: {actual:.4f}")
    else:
        failed += 1
        print(f"  FAIL {label}: got {actual:.4f}, expected {expected:.4f} (diff {diff:.4f})")

def roundup(val):
    return math.ceil(val)

# ═══════════════════════════════════════════════════════════════
# PRICING (from Drop Downs)
# ═══════════════════════════════════════════════════════════════
EPS_PRICE = [0.30, 0.40, 0.50]
TUBING_600S162_43 = 2.22  # index 8
TRACK_600T125_43 = 1.94   # index 5
ANGLE_18GA = 0.88          # index 2
WOOD_2x4 = 0.40            # index 1
OSB = 0.47                 # index 1
DRILL_6IN = 0.30           # index 2
WAFER = 0.03
BUGLE = 0.05
SHEATH_FASTENER = 0.03
LIFT_RING = 2.00
FLAT_METAL_3x6 = 1.78125
BENT_8IN = 4.60            # index 3
LVL_11_7_8 = 7.609         # index 4
SIMPSON = 4.09

# ═══════════════════════════════════════════════════════════════
print("\n=== WALLS TEST ===")
# 10ft high, 100ft long, 6" thick, 4" EPS
h, l, thick, epsThick = 10, 100, 6, 4
cornerQty = 5

# EPS: SF * epsThick * price
epsSF = h * l  # 1000
epsBdFt = epsSF * epsThick  # 4000
epsCost = epsBdFt * EPS_PRICE[0]  # 1200
assert_eq("EPS BdFt", epsBdFt, 4000)
assert_eq("EPS cost", epsCost, 1200)

# Inside studs: ROUNDUP(l/2) * h * price
insideCount = roundup(l / 2)  # 50
insideLnFt = insideCount * h  # 500
insideCost = insideLnFt * TUBING_600S162_43  # 1110
assert_eq("Inside stud count", insideCount, 50)
assert_eq("Inside stud LnFt", insideLnFt, 500)
assert_eq("Inside stud cost", insideCost, 1110)

# Outside studs: same
outsideCount = roundup(l / 2)  # 50
outsideLnFt = outsideCount * h  # 500
assert_eq("Outside stud LnFt", outsideLnFt, 500)

# Top track: installed = l = 100
topTrackCost = l * TRACK_600T125_43  # 194
assert_eq("Top track cost", topTrackCost, 194)

# Top angles: installed = l*2 = 200
topAngleLnFt = l * 2  # 200
topAngleCost = topAngleLnFt * ANGLE_18GA  # 176
assert_eq("Top angle LnFt", topAngleLnFt, 200)
assert_eq("Top angle cost", topAngleCost, 176)

# Bottom angles: shipped = l = 100
btmAngleLnFt = l  # 100
assert_eq("Bottom angle LnFt", btmAngleLnFt, 100)

# Top plates: installed = l * price
topPlatesCost = l * WOOD_2x4  # 40
assert_eq("Top plates cost", topPlatesCost, 40)

# Ext sheathing: h*l * price
sheathSF = h * l  # 1000
sheathCost = sheathSF * OSB  # 470
assert_eq("Sheathing SF", sheathSF, 1000)
assert_eq("Sheathing cost", sheathCost, 470)

# Corners: 5 * 6 = 30 tubes, each 10ft = 300 LnFt
cornerTubes = cornerQty * 6  # 30
cornerLnFt = cornerTubes * h  # 300
cornerCost = cornerLnFt * TUBING_600S162_43  # 666
assert_eq("Corner tube LnFt", cornerLnFt, 300)
assert_eq("Corner tube cost", cornerCost, 666)

# Ext corner angle: cornerQty * h = 50
extCornerLnFt = cornerQty * h  # 50
extCornerCost = extCornerLnFt * ANGLE_18GA  # 44
assert_eq("Ext corner angle LnFt", extCornerLnFt, 50)
assert_eq("Ext corner angle cost", extCornerCost, 44)

# Int corner angle: ROUNDUP(h/3) * cornerQty = 4 * 5 = 20
intCornerQty = roundup(h / 3) * cornerQty  # 20
assert_eq("Int corner qty", intCornerQty, 20)

# Lift rings: l/4 = 25
liftRingQty = l / 4  # 25
liftRingCost = liftRingQty * LIFT_RING  # 50
assert_eq("Lift ring qty", liftRingQty, 25)
assert_eq("Lift ring cost", liftRingCost, 50)

# 3x6 flat metal: l/4 = 25
flatMetalQty = l / 4  # 25
assert_eq("Flat metal qty", flatMetalQty, 25)

# Roof screws: ROUNDUP(outsideLnFt + endPanel/2 + corner/2/3 + beamSpt/2/3)
# = ROUNDUP(500 + 0 + 300/2/3 + 0) = ROUNDUP(550) = 550
roofScrewQty = roundup(outsideLnFt + 0 + cornerLnFt / 2 / 3 + 0)
assert_eq("Roof screw qty", roofScrewQty, 550)

# Wafer head: (50+50+25+25+30+0+5+20)*10 = 2050
waferQty = (insideCount + outsideCount + liftRingQty + flatMetalQty +
            cornerTubes + 0 + cornerQty + intCornerQty) * 10
assert_eq("Wafer head qty", waferQty, 2050)

# Bugle head: topPlatesInstalled=Yes → l*2 = 200
bugleQty = l * 2  # 200
assert_eq("Bugle head qty", bugleQty, 200)

# Sheathing fasteners: sheathSF + moistureSF = 1000
assert_eq("Sheathing fastener qty", sheathSF, 1000)

# ═══════════════════════════════════════════════════════════════
print("\n=== WINDOWS TEST ===")
w, h_win, wallHt, wallThick, epsThk, headerHt = 3, 4, 10, 6, 4, 8

# EPS Header: (wallHt - headerHt) * w = (10-8)*3 = 6 SF, BdFt = 6*4 = 24
headerEpsBdFt = (wallHt - headerHt) * w * epsThk  # 24
assert_eq("EPS Header BdFt", headerEpsBdFt, 24)
assert_eq("EPS Header cost", headerEpsBdFt * EPS_PRICE[0], 7.20)

# EPS Footer: (headerHt - h_win) * w = (8-4)*3 = 12 SF, BdFt = 48
footerEpsBdFt = (headerHt - h_win) * w * epsThk  # 48
assert_eq("EPS Footer BdFt", footerEpsBdFt, 48)
assert_eq("EPS Footer cost", footerEpsBdFt * EPS_PRICE[0], 14.40)

# King: 4 * wallHt = 40
kingLnFt = 4 * wallHt  # 40
assert_eq("King LnFt", kingLnFt, 40)
assert_eq("King cost", kingLnFt * TUBING_600S162_43, 88.80)

# Jack: 4 * headerHt = 32
jackLnFt = 4 * headerHt  # 32
assert_eq("Jack LnFt", jackLnFt, 32)
assert_eq("Jack cost", jackLnFt * TUBING_600S162_43, 71.04)

# Header tube: 1 * (wallHt - headerHt) = 2
headerTubeLnFt = 1 * (wallHt - headerHt)  # 2
assert_eq("Header tube LnFt", headerTubeLnFt, 2)

# Footer tube: 1 * (headerHt - h_win) = 4
footerTubeLnFt = 1 * (headerHt - h_win)  # 4
assert_eq("Footer tube LnFt", footerTubeLnFt, 4)

# Track perimeter: 2*h_win + w = 11 (sides + bottom)
trackLnFt = 2 * h_win + w  # 11
assert_eq("Track perimeter", trackLnFt, 11)

# Wood bucks: (w+h_win)*2 = 14
woodBuckLnFt = (w + h_win) * 2  # 14
assert_eq("Wood bucks LnFt", woodBuckLnFt, 14)

# Footer angle: (w+1)*2 = 8
footerAngleLnFt = (w + 1) * 2  # 8
assert_eq("Footer angle LnFt", footerAngleLnFt, 8)

# Roof screws: ROUNDUP(40/6) + ROUNDUP(32/6) + ROUNDUP(1) + ROUNDUP(2) = 7+6+1+2 = 16
roofScrews = roundup(kingLnFt/2/3) + roundup(jackLnFt/2/3) + roundup(headerTubeLnFt/2) + roundup(footerTubeLnFt/2)
assert_eq("Roof screw qty", roofScrews, 16)

# Wafer head: (1+1+4+4)*20 = 200
waferQtyWin = (1 + 1 + 4 + 4) * 20  # 200
assert_eq("Wafer head qty", waferQtyWin, 200)

# Bugle head: woodBucks=Yes, 14*2 = 28
bugleQtyWin = woodBuckLnFt * 2  # 28
assert_eq("Bugle head qty", bugleQtyWin, 28)

# EPS deduction: -(3*4)*4*0.30 = -14.40
epsDeduction = -(w * h_win) * epsThk * EPS_PRICE[0]
assert_eq("EPS deduction", epsDeduction, -14.40)

# Inside stud deduction: -(w/2 * wallHt) * price = -(1.5*10)*2.22 = -33.30
insideDeduction = -(w / 2 * wallHt) * TUBING_600S162_43
assert_eq("Inside stud deduction", insideDeduction, -33.30)

# ═══════════════════════════════════════════════════════════════
print("\n=== DOORS TEST ===")
w_d, h_d, wallHt_d, headerHt_d = 3, 7, 10, 8

# EPS Header only: (10-8)*3 = 6 SF, BdFt = 24
assert_eq("Door EPS Header BdFt", (wallHt_d - headerHt_d) * w_d * 4, 24)

# Perimeter = 2*h + w (NO bottom for doors)
doorPerimeter = 2 * h_d + w_d  # 17
assert_eq("Door perimeter", doorPerimeter, 17)

# Structural headers: (w+1)*2 = 8
strHeaderLnFt = (w_d + 1) * 2  # 8
assert_eq("Str header LnFt", strHeaderLnFt, 8)

# ═══════════════════════════════════════════════════════════════
print("\n=== GABLES TEST ===")
rise, run, gLen = 6, 12, 20

# gableHeight = (6/12) * (0.5*20) = 5
gableHt = (rise / run) * (0.5 * gLen)
assert_eq("Gable height", gableHt, 5)

# gableRun = SQRT(5² + 10²) = 11.18
gableRun = math.sqrt(gableHt**2 + (gLen/2)**2)
assert_eq("Gable run", gableRun, 11.18, 0.01)

# SF = 0.5 * 20 * 5 = 50
gableSF = 0.5 * gLen * gableHt
assert_eq("Gable SF", gableSF, 50)

# Inside studs: count = 20/2 = 10, AVERAGE length = 5/2 = 2.5, total = 25
insideStudLnFt_g = (gLen / 2) * (gableHt / 2)
assert_eq("Gable inside stud LnFt", insideStudLnFt_g, 25)

# Top track = gableRun * 2 = 22.36
topTrack_g = gableRun * 2
assert_eq("Gable top track", topTrack_g, 22.36, 0.01)

# Bottom track = gableLength = 20
assert_eq("Gable bottom track", gLen, 20)

# ═══════════════════════════════════════════════════════════════
print("\n=== BOX BEAMS TEST ===")
wallHt_bb, wallThick_bb, beamLen, beamHt = 10, 6, 12, 1

# EPS: beamLen * beamHt * wallThick = 12*1*6 = 72 BdFt
epsBdFt_bb = beamLen * beamHt * wallThick_bb
assert_eq("Box beam EPS BdFt", epsBdFt_bb, 72)

# Top plates: 2 * 12 = 24 LnFt
assert_eq("Top plates LnFt", 2 * beamLen, 24)

# LVL: 2 * 12 = 24 LnFt * $7.609
lvlCost = 2 * beamLen * LVL_11_7_8
assert_eq("LVL cost", lvlCost, 182.616)

# King: 4 * 10 = 40
assert_eq("King LnFt", 4 * wallHt_bb, 40)

# Jack: 4 * (10-1) = 36
assert_eq("Jack LnFt", 4 * (wallHt_bb - beamHt), 36)

# Wafer: flatPlateQty * 20 = 4*20 = 80
assert_eq("Wafer qty", 4 * 20, 80)

# Bugle: beamLen * 4 = 48
assert_eq("Bugle qty", beamLen * 4, 48)

# ═══════════════════════════════════════════════════════════════
print("\n=== GABLE ROOF TEST ===")
rise_gr, run_gr, ridgeLen_gr, gableLen_gr, overhang_gr = 6, 12, 40, 30, 2

# gableHt = (6/12) * (0.5*30) = 7.5
gableHt_gr = (rise_gr / run_gr) * (0.5 * gableLen_gr)
assert_eq("Gable roof height", gableHt_gr, 7.5)

# gableRun = SQRT(7.5² + 15²) = SQRT(281.25) = 16.77
gableRun_gr = math.sqrt(gableHt_gr**2 + (gableLen_gr/2)**2)
assert_eq("Gable roof run", gableRun_gr, 16.77, 0.01)

# roofRun = SQRT(7.5² + 17²) = SQRT(345.25) = 18.58
roofRun_gr = math.sqrt(gableHt_gr**2 + (gableLen_gr/2 + overhang_gr)**2)
assert_eq("Roof run w/ OH", roofRun_gr, 18.58, 0.01)

# SF = 40 * 18.58 * 2 = 1486.6
expectedSF_gr = ridgeLen_gr * roofRun_gr * 2
assert_eq("Gable roof SF", expectedSF_gr, 1486.6, 1)

# Inside rafters: ROUNDUP(40) = 40 * gableRun = 40*16.77 = 670.8
insideRafterLnFt_gr = 40 * gableRun_gr
assert_eq("Inside rafter LnFt", insideRafterLnFt_gr, 670.8, 0.5)

# Outside rafters: 40 * roofRun = 40*18.58 = 743.3
outsideRafterLnFt_gr = 40 * roofRun_gr
assert_eq("Outside rafter LnFt", outsideRafterLnFt_gr, 743.3, 0.5)

# ═══════════════════════════════════════════════════════════════
print("\n=== HIP ROOF TEST ===")
rise_hr, run_hr = 6, 12
ridgeLen_hr, eavePar_hr, eavePerp_hr, oh_hr = 20, 40, 30, 2

# ridgeHt = (6/12)*(0.5*30) = 7.5
ridgeHt_hr = (rise_hr / run_hr) * (0.5 * eavePerp_hr)
assert_eq("Hip ridge height", ridgeHt_hr, 7.5)

# hipRoofRun = SQRT(7.5² + 15²) = 16.77
hipRoofRun_hr = math.sqrt(ridgeHt_hr**2 + (eavePerp_hr/2)**2)
assert_eq("Hip roof run", hipRoofRun_hr, 16.77, 0.01)

# roofRunOH = SQRT(7.5² + 17²) = 18.58
roofRunOH_hr = math.sqrt(ridgeHt_hr**2 + (eavePerp_hr/2 + oh_hr)**2)
assert_eq("Hip roof run w/ OH", roofRunOH_hr, 18.58, 0.01)

# hipLength = SQRT(18.58² + 15²) = SQRT(570.2) = 23.88
hipLen_hr = math.sqrt(roofRunOH_hr**2 + (eavePerp_hr/2)**2)
assert_eq("Hip length", hipLen_hr, 23.88, 0.01)

# SF = (15*18.58*4) + (20*18.58*2) = 1114.9 + 743.3 = 1858.2
sf_hr = (eavePerp_hr/2 * roofRunOH_hr * 4) + (ridgeLen_hr * roofRunOH_hr * 2)
assert_eq("Hip roof SF", sf_hr, 1858.2, 1)

# Inside rafters (ridge): 20 * hipRoofRun = 20*16.77 = 335.4
assert_eq("Inside rafter ridge", 20 * hipRoofRun_hr, 335.4, 0.5)

# Inside rafters (hip): 30 * hipRoofRun/2 = 30*8.385 = 251.6
assert_eq("Inside rafter hip", 30 * hipRoofRun_hr / 2, 251.6, 0.5)

# ═══════════════════════════════════════════════════════════════
print("\n=== SKYLIGHTS TEST ===")
w_sl, h_sl, roofRun_sl, epsThk_sl = 3, 3, 12, 4

# EPS header = (12-3)/2 * 3 = 13.5 SF, BdFt = 54
epsPieceSF_sl = (roofRun_sl - h_sl) / 2 * w_sl
assert_eq("Skylight EPS piece SF", epsPieceSF_sl, 13.5)
assert_eq("Skylight EPS BdFt", epsPieceSF_sl * epsThk_sl, 54)

# King studs: 4 * 12 = 48
assert_eq("King LnFt", 4 * roofRun_sl, 48)

# Header tubes: ROUNDUP(3)=3, length=(12-3)/2=4.5, total=13.5
assert_eq("Header tube LnFt", roundup(w_sl) * ((roofRun_sl - h_sl) / 2), 13.5)

# ═══════════════════════════════════════════════════════════════
print("\n=== LABOR TEST ===")
# Employee rates: 30+32+23+23+31+26+23 = 188, *1.15 = 216.2, /7 = 30.886
avgRate = sum([30,32,23,23,31,26,23]) * 1.15 / 7
assert_eq("Avg cost/hr", avgRate, 30.886, 0.01)

# Wall panels: SF=1000, h=10, qty=2
# basePanels = ceil(1000/8/10) = ceil(12.5) = 13
# height 10 → 1.07 mult → ceil(13*1.07)=ceil(13.91)=14 per unit * 2 = 28
basePanels = math.ceil(1000 / 8 / 10)
assert_eq("Wall base panels", basePanels, 13)
adjustedPanels = math.ceil(basePanels * 1.07) * 2
assert_eq("Wall panel count", adjustedPanels, 28)

# Corner count: 5 corners, 10ft → mult=1.07 → ceil(5.35) = 6
cornerPanels = math.ceil(5 * 1.07)
assert_eq("Corner panel count", cornerPanels, 6)

# Window panels (small): w=3 (<=4ft), mult=1.0, qty=4 → 4
assert_eq("Window panel small", math.ceil(4 * 1.0), 4)

# Window panels (large): w=6 (4-8ft), mult=1.3, qty=4 → ceil(5.2)=6
assert_eq("Window panel large", math.ceil(4 * 1.3), 6)

# Gable panels: 20ft, qty=2 → 20/4*2 = 10, mult for >12 = 1.3 → ceil(13)=13
gablePanels = math.ceil(20 / 4 * 2 * 1.3)
assert_eq("Gable panel count", gablePanels, 13)

# ═══════════════════════════════════════════════════════════════
print(f"\n{'='*50}")
print(f"RESULTS: {passed} passed, {failed} failed out of {passed + failed} tests")
print(f"{'='*50}\n")

sys.exit(1 if failed > 0 else 0)
