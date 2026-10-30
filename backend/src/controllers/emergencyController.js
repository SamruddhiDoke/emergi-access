import * as emergencyService from '../services/emergencyService.js';
import { renderSummaryPdf, sectionsFromDisclosure } from '../services/pdfService.js';
import { AuditAction } from '../audit/actions.js';

export const identify = async (req, res) => res.json({ patient: await emergencyService.identifyPatient(req, req.body.emergencyId) });

export async function requestAccess(req, res) {
  res.status(201).json(await emergencyService.requestAccess(req, req.body));
}

export const verifyOtp = async (req, res) => res.json({ authorization: await emergencyService.verifyBreakGlassOtp(req, req.body) });
export const status = async (req, res) => res.json(await emergencyService.getAuthorizationStatus(req, req.params.id));
export const medicalInformation = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await emergencyService.getMedicalInformation(req, req.params.id));
};

export async function endAccess(req, res) {
  const authorization = await emergencyService.revokeAuthorization(req, req.params.id, {
    reason: req.body?.reason || 'Ended early by treating professional',
    scope: { professionalRefId: req.auth.professional.id },
    action: AuditAction.ACCESS_ENDED,
  });
  res.json({ authorization });
}

export const history = async (req, res) => res.json(await emergencyService.professionalHistory(req, req.query));
export const dashboard = async (req, res) => res.json(await emergencyService.professionalDashboard(req));

export async function summaryPdf(req, res) {
  // Goes through the same validation as the on-screen view, and is audited as an export.
  const { disclosure, authorization } = await emergencyService.getMedicalInformation(req, req.params.id, {
    action: AuditAction.SUMMARY_EXPORTED,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="emergency-summary-${authorization.id.slice(0, 8)}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  renderSummaryPdf(
    {
      title: 'Emergency Medical Summary',
      subtitle: `Minimum-necessary disclosure for ${authorization.professionalRole.toLowerCase()} access. Valid only while the authorization is active.`,
      identity: [
        ['Patient', disclosure.patient.fullName],
        ['Emergency ID', disclosure.patient.emergencyId],
        ['Age', String(disclosure.patient.age)],
        ['Accessed by', `${req.auth.user.fullName} · ${authorization.professionalId}`],
        ['Organization', authorization.organization],
        ['Authorization', authorization.id],
        ['Expires', new Date(authorization.expiresAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
      ],
      sections: sectionsFromDisclosure(disclosure),
      footer:
        'Confidential. Generated under a time-limited, audited break-glass authorization. Emergi-Access hackathon prototype — synthetic data, not a certified clinical system.',
    },
    res,
  );
}
