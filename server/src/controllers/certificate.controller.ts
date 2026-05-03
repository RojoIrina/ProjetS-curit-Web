// ================================================================
// CERTIFICATE CONTROLLER — Issuance, listing, revocation
// ================================================================
import { Request, Response, NextFunction } from 'express';
import * as certificateService from '../services/certificate.service.js';
import * as cryptoService from '../services/crypto.service.js';
import * as pdfService from '../services/pdf.service.js';
import * as auditService from '../services/audit.service.js';
import { env } from '../config/env.js';

export async function issue(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await certificateService.issueCertificate({
      studentId: req.body.studentId,
      institutionId: req.body.institutionId || req.user!.institutionId!,
      issuedBy: req.user!.id,
      title: req.body.title,
    });

    await auditService.logAudit({
      userId: req.user!.id,
      action: 'certificate.issued',
      resourceType: 'certificate',
      resourceId: cert.id,
      details: {
        certificateUid: cert.certificateUid,
        studentId: cert.studentId,
        studentName: cert.studentName,
      },
      ipAddress: req.ip,
    });

    // Generate QR code payload
    const qrPayload = cryptoService.generateSecureQRPayload(
      cert.certificateUid,
      env.CORS_ORIGIN
    );

    const { digitalSignature: _digitalSignature, ...certWithOneTimeKey } = cert;
    res.status(201).json({
      success: true,
      data: { ...certWithOneTimeKey, qrPayload },
    });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId, institutionId, limit, offset } = req.query as Record<string, string>;

    // Students can only see their own certificates
    const effectiveStudentId =
      req.user!.role === 'student' ? req.user!.id : studentId;

    const certs = await certificateService.listCertificates({
      studentId: effectiveStudentId,
      institutionId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json({ success: true, data: certs });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await certificateService.getCertificateById(req.params.id);

    // Students can only see their own certificates
    if (req.user!.role === 'student' && cert.studentId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Accès interdit' });
      return;
    }

    // Generate QR payload for the certificate
    const qrPayload = cryptoService.generateSecureQRPayload(
      cert.certificateUid,
      env.CORS_ORIGIN
    );

    const { accessKey: _accessKey, digitalSignature: _digitalSignature, ...safeCert } = cert;
    res.json({ success: true, data: { ...safeCert, qrPayload } });
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await certificateService.getCertificateById(req.params.id);

    if (req.user!.role === 'student' && cert.studentId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Accès interdit' });
      return;
    }

    const qrPayload = cryptoService.generateSecureQRPayload(
      cert.certificateUid,
      env.CORS_ORIGIN
    );
    const pdf = await pdfService.generateCertificatePdf({ ...cert, qrPayload });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificat-${cert.certificateUid}.pdf"`);
    res.setHeader('X-CertiVerify-PDF-SHA256', pdf.sha256);
    res.send(pdf.buffer);
  } catch (err) {
    next(err);
  }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    const cert = await certificateService.revokeCertificate(
      req.params.id,
      req.body.reason,
      req.user!.id
    );

    await auditService.logAudit({
      userId: req.user!.id,
      action: 'certificate.revoked',
      resourceType: 'certificate',
      resourceId: cert.id,
      details: { reason: req.body.reason, certificateUid: cert.certificateUid },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
}

/** Public download — requires access key, no auth */
export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const { uid } = req.params;
    const { key } = req.query as Record<string, string>;

    if (!key) {
      res.status(400).json({ success: false, error: 'Clé d\'accès requise (paramètre ?key=...)' });
      return;
    }

    const cert = await certificateService.downloadCertificate(uid.toUpperCase(), key);
    res.json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
}

export async function downloadPublicPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { uid } = req.params;
    const { key } = req.query as Record<string, string>;

    if (!key) {
      res.status(400).json({ success: false, error: 'Clé d\'accès requise (paramètre ?key=...)' });
      return;
    }

    const cert = await certificateService.downloadCertificate(uid.toUpperCase(), key);
    const qrPayload = cryptoService.generateSecureQRPayload(
      cert.certificateUid,
      env.CORS_ORIGIN
    );
    const pdf = await pdfService.generateCertificatePdf({ ...cert, qrPayload });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificat-${cert.certificateUid}.pdf"`);
    res.setHeader('X-CertiVerify-PDF-SHA256', pdf.sha256);
    res.send(pdf.buffer);
  } catch (err) {
    next(err);
  }
}
