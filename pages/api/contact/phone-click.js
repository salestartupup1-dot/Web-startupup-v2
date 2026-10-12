import { rateLimit, requireTracking, respondError, sameOrigin } from '../../../lib/lineServer';
import { phoneClickRecord, recordPhoneClick } from '../../../lib/phoneClickServer';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  try {
    requireTracking();
    sameOrigin(req);
    phoneClickRecord(req.body);
    await rateLimit(req, 'phone-click');
    await recordPhoneClick(req.body);
    return res.status(204).end();
  } catch (error) { return respondError(res, error); }
}
