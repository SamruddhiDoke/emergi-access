import * as patientService from '../services/patientService.js';
import { renderSummaryPdf, sectionsFromFullRecord } from '../services/pdfService.js';

export const dashboard = async (req, res) => res.json(await patientService.dashboard(req));
export const getProfile = async (req, res) => res.json(await patientService.getProfile(req));
export const updateProfile = async (req, res) => res.json(await patientService.updateProfile(req, req.body));
export const emergencyId = async (req, res) => res.json(await patientService.getEmergencyId(req));
export const qr = async (req, res) => res.json(await patientService.getQr(req));
export const accessHistory = async (req, res) => res.json(await patientService.accessHistory(req, req.query));
export const authorizations = async (req, res) => res.json(await patientService.activeAuthorizations(req));

export async function qrPng(req, res) {
  const png = await patientService.getQrPng(req);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="emergi-access-${req.auth.patient.emergencyId}.png"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
}

export async function regenerateEmergencyId(req, res) {
  res.json(await patientService.regenerateEmergencyId(req, req.body?.password));
}

export async function revoke(req, res) {
  res.json({ authorization: await patientService.revokeOwnAuthorization(req, req.body) });
}

export async function summaryPdf(req, res) {
  const profile = await patientService.fullRecordForPdf(req);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="emergi-access-summary-${profile.emergencyId}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  renderSummaryPdf(
    {
      title: 'Personal Emergency Medical Summary',
      subtitle: 'Complete record as maintained by the patient. Synthetic demonstration data.',
      identity: [
        ['Name', profile.user.fullName],
        ['Emergency ID', profile.emergencyId],
        ['Date of birth', profile.dateOfBirth.toISOString().slice(0, 10)],
        ['Generated', new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'],
      ],
      sections: sectionsFromFullRecord(profile),
      footer:
        'Emergi-Access hackathon prototype. Not a certified medical record. Clinical decisions remain the responsibility of qualified healthcare professionals.',
    },
    res,
  );
}
