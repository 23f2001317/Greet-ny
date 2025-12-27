Drop your `.glb`/`.gltf` files in this folder.

Landing page (rabbit + panda):
- `/models/rabbit.glb`
- `/models/panda.glb`

Notes:
- If a model is missing, the landing page falls back to a stylized procedural rabbit + panda.

Performance tips (recommended for low-end laptops + mobile):
- Use **low-poly stylized** meshes (avoid tiny details and heavy subdivisions).
- Prefer **DRACO-compressed** GLB/GLTF geometry.
- Use a **single texture atlas** (one material/texture set) when possible.
- Keep textures small (e.g. 512–1024) and reuse UV space.
- Disable shadows in the model (the app also disables runtime shadows).
- Keep rigs lightweight: minimal bones, no constraints, and only the clips you need.
- Prefer one gentle **idle** clip (or none). The app renders scenes at ~20 FPS for battery/GPU friendliness.

DRACO decoding:
- This app supports DRACO at runtime via files in `/draco/`.
- Decoder files are expected at:
	- `/draco/draco_decoder.js`
	- `/draco/draco_decoder.wasm`
	- `/draco/draco_wasm_wrapper.js`
