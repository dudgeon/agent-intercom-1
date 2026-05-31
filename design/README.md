# design/ — industrial design (Fusion 360 + manufacturing assets)

Physical design of the countertop device. Authored in **Fusion 360** by the owner; this repo
holds the **manufacturable exports** so others can reproduce the device, and so the assistant
can read/critique/iterate on the geometry against the hardware BOM.

## What to commit here
- `sources/` — native Fusion 360 archives (`.f3d` / `.f3z`). **Binary + large → Git LFS.**
- `export/step/` — **STEP** (`.step`/`.stp`) for CAD interchange (preferred source of truth
  for review).
- `export/mesh/` — **STL** / **3MF** for 3D printing.
- `drawings/` — PDFs / 2D drawings, dimensioned.
- `renders/` — PNG renders & reference photos (helpful for the assistant to "see" the design).
- `CHANGELOG.md` — dated log of design iterations and what changed/why.

## Working with the assistant on CAD
The assistant can't open `.f3d` directly, but it **can** reason about:
- **STEP** geometry (text-readable structure) and **STL/3MF** meshes,
- **PNG renders / screenshots** (it sees images), and
- dimensioned **PDF drawings**.

So: when you iterate in Fusion 360, export a STEP + drop a render/screenshot here. The
assistant will check fit against `hardware/BOM.md` (screen cutout, board standoffs, speaker
chamber, mic ports, button/encoder placement, cable routing, wall thickness/printability) and
propose the next change.

## Constraints needed to start (open question Q9)
Counter footprint, screen size/shape (round vs. rectangular — couples to board choice in Q2),
soft-button count/placement, scroll-wheel location, speaker chamber volume, mic-array
geometry, power connector, material/finish (kitchen-wipeable), and the intended "appliance vs.
gadget" aesthetic.

## Git LFS note
Native CAD and meshes are large binaries. Before committing them, enable LFS:

```
git lfs install
git lfs track "*.f3d" "*.f3z" "*.step" "*.stp" "*.stl" "*.3mf"
git add .gitattributes
```
