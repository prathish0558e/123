# TCT mascot integration

The mascot is a lazy-loaded React Three Fiber scene. Its canvas is transparent,
fixed above the site and uses local lights; it does not tint the website. The
chat panel is accessible DOM UI over the scene, and the existing `/api/leads`
submission path remains the lead-capture integration.

## Character asset

No rigged GLB/GLTF character is currently present in this project. The default
guide is a human figure built from articulated Three.js geometry, with a matching
SVG person for street and WebGL fallback use. The procedural figure is not a
photoreal, skinned production asset.

To use the final character:

1. Put the rigged human model at `public/models/tct-fashion-guide.glb`.
2. Set `VITE_TCT_HUMAN_GLB=/models/tct-fashion-guide.glb` in the local/deployment Vite
   environment and restart the dev server/build.
3. Export the model in meters, facing +Z, with the root origin at the boot
   soles and the person's front toward +Z. Avoid root-motion tracks; the scene
   controller handles travel between the cloud and chat position. Use ordinary
   skin, hair, fabric and footwear materials, with a human face and proportions.
4. Preserve these named rig nodes/pivots: `Torso shell`, `TCT badge frame`,
   `HeadPivot`, `EyeLeft`, `EyeRight`, `EyeClosedLeft`, `EyeClosedRight`,
   `Arm_L`, `Elbow_L`, `Arm_R`, `Elbow_R`, `Leg_L`, `Knee_L`, `Foot_L`,
   `Leg_R`, `Knee_R`, `Foot_R`. Eye groups must be separate. The chest badge
   should remain a front-facing surface named `TCT badge frame` so the scene
   can apply the existing TCT wordmark.
5. Name clips `Sleep`, `WakeUp`, `Stretch`, `Stand`, `Walk`, `Idle`, `Talk`,
   `Wave`, `Turn`, `Climb`, and `LieDown` where available. `Walk` should loop
   in place and include alternating foot contacts; the controller crossfades
   matching clips by state. The procedural joint animation remains a fallback
   for missing clip names. The model contract and fallback checks are in
   `robotAsset.js`.

An incompatible or absent human GLB falls back to the procedural human with a
console warning. A rigged human asset is needed for detailed facial sculpting,
skin deformation and authored sit/lie-down animation.

## AI service

The current server has lead capture at `/api/leads`, but no generative AI chat
endpoint. Without configuration, the panel uses a clearly labelled guided
responder built from published TCT content. It does not claim to be a live LLM.

To connect a real assistant, set `VITE_TCT_AI_ENDPOINT` to a same-origin server
endpoint that accepts `POST` JSON `{ "message": "...", "history": [...] }`
and returns `{ "reply": "..." }`. Keep provider credentials on that server;
do not put secret keys in a `VITE_` variable. The browser adapter is
`assistantService.js`. Existing lead details still submit through `postLead` in
`src/api.js`.

## State flow

`store.js` runs the explicit loop: `sleep → waking → stretch → transform → walk
→ arrive → chat → goodnight → dissolve → walkback → board → settle → sleep`.
The scene reads phase progress from this one controller; animations are not
chained with a scattered set of phase timers.

## Run and verify

The repository already includes React, Three.js, React Three Fiber and GSAP;
no new package is required. Run `npm run dev` for the app and `npm run build`
for a production build. The mascot chat answer adapter is
`assistantService.js`; the visual state/rig controller is in `Robot.jsx` and
`Scene.jsx`.
