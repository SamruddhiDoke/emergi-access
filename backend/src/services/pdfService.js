import PDFDocument from 'pdfkit';

const TEAL = '#087F8C';
const NAVY = '#142B45';
const INK = '#172B3A';
const MUTED = '#687786';
const LINE = '#E3E8EC';

const humanize = (v) => String(v ?? '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/**
 * Renders an emergency medical summary. `sections` is built by the caller from data the requester is
 * already authorised to see — this module never fetches medical data itself.
 *
 * @param {{ title: string, subtitle: string, identity: [string,string][], sections: {heading: string, items: string[]}[], footer: string }} doc
 */
export function renderSummaryPdf(doc, stream) {
  const pdf = new PDFDocument({ size: 'A4', margin: 48, info: { Title: doc.title, Author: 'Emergi-Access' } });
  pdf.pipe(stream);
  const width = pdf.page.width - 96;

  pdf.rect(0, 0, pdf.page.width, 6).fill(TEAL);
  pdf.moveDown(0.5);
  pdf.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('EMERGI-ACCESS', 48, 32, { characterSpacing: 1.5 });
  pdf.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(doc.title, 48, 52);
  pdf.fillColor(MUTED).font('Helvetica').fontSize(10).text(doc.subtitle, 48, 78, { width });

  let y = 110;
  pdf.roundedRect(48, y, width, 20 + doc.identity.length * 16, 6).fillAndStroke('#F7F9FA', LINE);
  y += 12;
  for (const [label, value] of doc.identity) {
    pdf.fillColor(MUTED).font('Helvetica').fontSize(9).text(label.toUpperCase(), 62, y, { width: 150, characterSpacing: 0.5 });
    pdf.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(value ?? '—', 210, y - 1, { width: width - 170 });
    y += 16;
  }
  pdf.y = y + 18;

  for (const section of doc.sections) {
    if (pdf.y > pdf.page.height - 120) pdf.addPage();
    pdf.fillColor(TEAL).font('Helvetica-Bold').fontSize(9).text(section.heading.toUpperCase(), 48, pdf.y, { characterSpacing: 1 });
    pdf.moveTo(48, pdf.y + 3).lineTo(48 + width, pdf.y + 3).strokeColor(LINE).lineWidth(1).stroke();
    pdf.moveDown(0.6);
    const items = section.items.length ? section.items : ['None recorded'];
    for (const item of items) {
      pdf.fillColor(section.items.length ? INK : MUTED).font('Helvetica').fontSize(10.5).text(`•  ${item}`, 56, pdf.y, { width: width - 8 });
      pdf.moveDown(0.25);
    }
    pdf.moveDown(0.9);
  }

  pdf.fillColor(MUTED).font('Helvetica').fontSize(8).text(doc.footer, 48, pdf.page.height - 70, { width, align: 'left' });
  pdf.end();
}

const fmtAllergy = (a) => `${a.allergen} — ${humanize(a.severity)}${a.reaction ? ` (${a.reaction})` : ''}`;
const fmtCondition = (c) => `${c.name} — ${humanize(c.severity)}${c.diagnosedYear ? `, since ${c.diagnosedYear}` : ''}${c.notes ? `. ${c.notes}` : ''}`;
const fmtMed = (m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' · ') + (m.isCritical && m.alertNote ? `  [ALERT: ${m.alertNote}]` : '');
const fmtHistory = (h) => `${h.year ? `${h.year} — ` : ''}${h.title}${h.notes ? `. ${h.notes}` : ''}`;
const fmtContact = (c) => `${c.name} (${c.relationship}) — ${c.phone}${c.isPrimary ? ' · Primary' : ''}`;

/** Sections for a role-filtered disclosure (what an authorised clinician sees). */
export function sectionsFromDisclosure(d) {
  const s = [
    { heading: 'Blood group', items: d.bloodGroup ? [d.bloodGroup] : [] },
    { heading: 'Critical medical alerts', items: d.criticalAlerts.map((a) => `${a.title}${a.details ? ` — ${a.details}` : ''}`) },
    { heading: 'Severe allergies', items: d.severeAllergies.map(fmtAllergy) },
  ];
  if (d.majorConditions) s.push({ heading: 'Major medical conditions', items: d.majorConditions.map(fmtCondition) });
  if (d.medicationAlerts) s.push({ heading: 'Medication alerts', items: d.medicationAlerts.map((m) => `${m.name}${m.alertNote ? ` — ${m.alertNote}` : ''}`) });
  if (d.currentMedications) s.push({ heading: 'Current medications', items: d.currentMedications.map(fmtMed) });
  if (d.medicalHistory) s.push({ heading: 'Relevant medical history', items: d.medicalHistory.map(fmtHistory) });
  if (d.specialtyConditions) s.push({ heading: `${humanize(d.specialtyScope)} conditions`, items: d.specialtyConditions.map(fmtCondition) });
  if (d.specialtyMedications) s.push({ heading: `${humanize(d.specialtyScope)} medications`, items: d.specialtyMedications.map(fmtMed) });
  if (d.specialtyHistory) s.push({ heading: `${humanize(d.specialtyScope)} history`, items: d.specialtyHistory.map(fmtHistory) });
  if (d.emergencyContacts) s.push({ heading: 'Emergency contacts', items: d.emergencyContacts.map(fmtContact) });
  return s;
}

/** Sections for the patient's own complete record. */
export function sectionsFromFullRecord(profile) {
  const m = profile.medical ?? { allergies: [], conditions: [], medications: [], alerts: [], history: [] };
  return [
    { heading: 'Blood group', items: m.bloodGroup ? [m.bloodGroup] : [] },
    { heading: 'Critical medical alerts', items: m.alerts.map((a) => `${a.title}${a.details ? ` — ${a.details}` : ''}`) },
    { heading: 'Allergies', items: m.allergies.map(fmtAllergy) },
    { heading: 'Chronic conditions', items: m.conditions.map(fmtCondition) },
    { heading: 'Current medications', items: m.medications.map(fmtMed) },
    { heading: 'Medical history', items: m.history.map(fmtHistory) },
    { heading: 'Emergency contacts', items: profile.contacts.map(fmtContact) },
  ];
}
