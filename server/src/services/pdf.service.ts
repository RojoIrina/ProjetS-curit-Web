import crypto from 'node:crypto';
import { degrees, PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';

type CertificatePdfData = {
  certificateUid: string;
  title: string;
  studentName: string;
  issuedAt: Date | string;
  documentHash: string;
  digitalSignature?: string;
  institution?: { name: string } | null;
  qrPayload?: string;
};

export async function generateCertificatePdf(certificate: CertificatePdfData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const verifyUrl = certificate.qrPayload
    ?? `${env.CORS_ORIGIN}/verify?uid=${certificate.certificateUid}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 });
  const qrImage = await pdfDoc.embedPng(qrDataUrl);

  const navy = rgb(0.06, 0.09, 0.16);
  const slate = rgb(0.28, 0.33, 0.42);
  const indigo = rgb(0.31, 0.27, 0.9);
  const light = rgb(0.96, 0.97, 0.99);
  const emerald = rgb(0.06, 0.65, 0.45);

  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: light, borderWidth: 14 });
  page.drawRectangle({ x: 52, y: 52, width: width - 104, height: height - 104, borderColor: rgb(0.88, 0.9, 0.94), borderWidth: 1 });

  page.drawText('CERTIVERIFY OFFICIAL', {
    x: 162,
    y: 292,
    size: 44,
    font: bold,
    color: rgb(0.94, 0.95, 0.97),
    rotate: degrees(-18),
  });

  centerText(page, bold, 'CERTIFICAT DE REUSSITE ACADEMIQUE', 16, height - 120, navy);
  centerText(page, italic, 'Ce document certifie officiellement que', 18, height - 175, slate);
  centerText(page, bold, certificate.studentName, 42, height - 235, navy);
  centerText(page, font, 'a valide le cursus et les competences requises pour la formation', 15, height - 285, slate);
  centerText(page, bold, certificate.title, 18, height - 320, navy);

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const institutionName = certificate.institution?.name ?? 'CertiVerify Academy';

  drawLabelValue(page, bold, font, 'DATE D EMISSION', issuedDate, 76, 142, slate, navy);
  drawLabelValue(page, bold, font, 'IDENTIFIANT UNIQUE', certificate.certificateUid, 76, 96, slate, indigo);
  drawLabelValue(page, bold, font, 'INSTITUTION', institutionName, 76, 50, slate, navy);

  page.drawImage(qrImage, { x: width / 2 - 54, y: 58, width: 108, height: 108 });
  centerText(page, bold, 'SCAN TO VERIFY', 8, 42, slate);

  page.drawText('DIGITAL SIGNATURE HASH', { x: width - 272, y: 150, size: 8, font: bold, color: slate });
  drawWrapped(page, font, certificate.documentHash, width - 272, 128, 190, 8, slate);

  const signatureFingerprint = certificate.digitalSignature
    ? crypto.createHash('sha256').update(certificate.digitalSignature).digest('hex')
    : '';
  page.drawText('SIGNATURE FINGERPRINT', { x: width - 272, y: 92, size: 8, font: bold, color: slate });
  drawWrapped(page, font, signatureFingerprint, width - 272, 70, 190, 8, slate);

  page.drawText('Verified by CertiVerify', { x: width - 272, y: 36, size: 12, font: bold, color: emerald });

  const bytes = await pdfDoc.save();
  const buffer = Buffer.from(bytes);
  return {
    buffer,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function centerText(
  page: Parameters<typeof drawLabelValue>[0],
  font: Parameters<typeof drawLabelValue>[2],
  text: string,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getSize().width - textWidth) / 2, y, size, font, color });
}

function drawLabelValue(
  page: import('pdf-lib').PDFPage,
  bold: import('pdf-lib').PDFFont,
  font: import('pdf-lib').PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  labelColor: ReturnType<typeof rgb>,
  valueColor: ReturnType<typeof rgb>
) {
  page.drawText(label, { x, y: y + 18, size: 8, font: bold, color: labelColor });
  page.drawText(value, { x, y, size: 12, font, color: valueColor });
}

function drawWrapped(
  page: import('pdf-lib').PDFPage,
  font: import('pdf-lib').PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const chunks = text.match(/.{1,32}/g) ?? [];
  chunks.slice(0, 4).forEach((line, index) => {
    page.drawText(line, { x, y: y - index * 10, size, font, color, maxWidth });
  });
}
