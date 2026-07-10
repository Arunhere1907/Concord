import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initialStadiumState } from "../src/data/initialState.js";
import { HTTP_STATUS } from "../lib/constants.js";
import { checkRateLimit, getClientIdentifier } from "../lib/security.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: 'Method not allowed' });
    return;
  }
  
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId);
  
  if (!rateLimit.allowed) {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ 
      error: 'Too many requests',
      resetTime: rateLimit.resetTime 
    });
    return;
  }

  res.status(HTTP_STATUS.OK).json(initialStadiumState);
}
