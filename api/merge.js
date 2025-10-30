import Replicate from "replicate";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { image1, image2, prompt } = req.body || {};
    if (!image1 || !image2) {
      return res.status(400).json({ error: "image1 and image2 required" });
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const model = "fofr/image-merger:latest";

    const output = await replicate.run(model, {
      input: {
        image_1: image1,
        image_2: image2,
        prompt:
          prompt ||
          "two people together, soft white curtain background, warm natural light, realistic photo"
      }
    });

    const url = Array.isArray(output) ? output[0] : output;
    return res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "merge_failed" });
  }
}
