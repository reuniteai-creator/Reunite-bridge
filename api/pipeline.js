import Replicate from "replicate";

// Force Node runtime on Vercel (not Edge)
export const config = { runtime: "nodejs" };

const MODEL_COMBINE = "flux-kontext-apps/multi-image-kontext-pro:latest";
const MODEL_FACEFIX = "xinntao/gfpgan:latest";            // try sczhou/codeformer:latest if you prefer
const MODEL_UPSCALE = "nightmareai/real-esrgan:latest";   // optional but nice

function pickUrl(result) {
  if (!result) return null;
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return result[0];
  if (result?.output) return pickUrl(result.output);
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

    const { img1, img2 } = req.body || {};
    if (!img1 || !img2) return res.status(400).json({ error: "img1 and img2 are required" });

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // 1) Combine two inputs onto white curtain
    const combineInput = {
      input_image_1: img1,
      input_image_2: img2,
      output_format: "png",
      aspect_ratio: "match_input_image",
      prompt:
        "Compose a warm, realistic portrait of the two people together as if photographed in the same studio, standing side by side, natural skin tones, true-to-face likeness, soft front light. Background: soft white curtain backdrop. Mid-torso crop. No logos, no artifacts."
    };
    const combined = await replicate.run(MODEL_COMBINE, { input: combineInput });
    const combinedUrl = pickUrl(combined);
    if (!combinedUrl) throw new Error("Combine step returned no URL.");

    // 2) Face fix (reduces wrong-face issues)
    const facefix = await replicate.run(MODEL_FACEFIX, { input: { img: combinedUrl } });
    const faceUrl = pickUrl(facefix) || combinedUrl;

    // 3) Optional upscale
    const upscaled = await replicate.run(MODEL_UPSCALE, { input: { image: faceUrl, scale: 2 } });
    const finalUrl = pickUrl(upscaled) || faceUrl;

    res.status(200).json({ url: finalUrl, debug: { combinedUrl, faceUrl } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
