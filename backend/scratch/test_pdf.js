const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');

const pdfLines = [
  '%PDF-1.4',
  '1 0 obj',
  '<< /Type /Catalog /Pages 2 0 R >>',
  'endobj',
  '2 0 obj',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  'endobj',
  '3 0 obj',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  'endobj',
  '4 0 obj',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  'endobj',
  '5 0 obj',
  '<< /Length 260 >>',
  'stream',
  'BT',
  '/F1 14 Tf',
  '72 700 Td',
  '(Invoice #9821 - ACME Medical Supplies) Tj',
  '0 -24 Td',
  '(Patient Name: John Doe) Tj',
  '0 -24 Td',
  '(Invoice Date: 2026-09-15) Tj',
  '0 -24 Td',
  '(Payment Due Date: 2026-10-15) Tj',
  '0 -24 Td',
  '(Diagnosis Notes: Regular blood sugar monitoring for type 2 diabetes.) Tj',
  '0 -24 Td',
  '(Total Amount Due: $150.00) Tj',
  'ET',
  'endstream',
  'endobj',
  'xref',
  '0 6',
  '0000000000 65535 f ',
  '0000000009 00000 n ',
  '0000000058 00000 n ',
  '0000000115 00000 n ',
  '0000000224 00000 n ',
  '0000000295 00000 n ',
  'trailer',
  '<< /Size 6 /Root 1 0 R >>',
  'startxref',
  '590',
  '%%EOF'
];

const pdfContent = pdfLines.join('\n');

async function testPdfApi() {
  const base64Data = Buffer.from(pdfContent).toString('base64');
  const secret = 'wellwisher_secure_jwt_secret_dev_32_chars_minimum_key!';
  const token = jwt.sign({ id: 9001, email: 'dev@wellwisher.com' }, secret, { expiresIn: '1h' });

  const payload = JSON.stringify({
    data: base64Data,
    mimeType: 'application/pdf',
    filename: 'Invoice_9821.pdf',
    prompt: 'What is the payment due date and does this document mention diabetes?'
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/jarvis/vision/document',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2));
    });
  });

  req.on('error', (err) => console.error('Error:', err));
  req.write(payload);
  req.end();
}

testPdfApi();
