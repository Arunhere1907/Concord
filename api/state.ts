import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initialStadiumState } from "../src/data/initialState.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json(initialStadiumState);
}
