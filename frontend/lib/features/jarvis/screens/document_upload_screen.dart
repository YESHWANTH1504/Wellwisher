import 'package:flutter/material.dart';
import '../controller/document_controller.dart';
import 'document_detail_screen.dart';

class DocumentUploadScreen extends StatefulWidget {
  final DocumentController? controller;

  const DocumentUploadScreen({super.key, this.controller});

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  late final DocumentController _controller;
  final TextEditingController _textController = TextEditingController();
  String _selectedTemplate = 'CBC Blood Report';

  final Map<String, String> _templates = {
    'CBC Blood Report': '''
CITY GENERAL HOSPITAL - LABORATORY SERVICES
PATIENT: John Doe    DATE: 2026-08-20
==================================================
COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL
--------------------------------------------------
TEST NAME            VALUE    UNIT      REF RANGE
--------------------------------------------------
Hemoglobin           13.8     g/dL      13.0 - 17.0
WBC Count            7500     /mcL      4000 - 11000
Platelets            250000   /mcL      150000 - 450000
Fasting Blood Glucose 118      mg/dL     70 - 100
Serum Creatinine     0.95     mg/dL     0.70 - 1.30
Total Cholesterol    215      mg/dL     125 - 200
Blood Pressure       128/82   mmHg
==================================================
''',
    'Prescription Note': '''
METRO HEALTH CLINIC - DR. EMILY WATSON, MD
Rx: Metformin 500 mg, twice daily with meals
Rx: Lisinopril 10 mg, once daily morning
Refills: 2
''',
    'Lipid & Vitals Panel': '''
WELLNESS DIAGNOSTICS - LAB REPORT
PATIENT: Sarah Jenkins
Total Cholesterol    190      mg/dL     125 - 200
HDL Cholesterol      55       mg/dL     40 - 60
LDL Cholesterol      110      mg/dL     0 - 100
Triglycerides        145      mg/dL     0 - 150
Heart Rate           72       bpm
Oxygen Saturation    98       %
''',
  };

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? DocumentController();
    _controller.addListener(_onControllerUpdate);
    _textController.text = _templates['CBC Blood Report']!;
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerUpdate);
    _textController.dispose();
    super.dispose();
  }

  Future<void> _handleUpload() async {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or paste document content to analyze.')),
      );
      return;
    }

    final success = await _controller.uploadDocument(
      ocrText: text,
      filename: '$_selectedTemplate.pdf',
      mimeType: 'application/pdf',
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document processed and verified successfully!')),
      );

      final latestDoc = _controller.documents.isNotEmpty ? _controller.documents.first : null;
      if (latestDoc != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => DocumentDetailScreen(
              documentId: latestDoc.id,
              initialDocument: latestDoc,
            ),
          ),
        );
      } else {
        Navigator.pop(context, true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isUploading = _controller.isUploading;
    final uploadStatus = _controller.uploadStatus;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Upload & Scan Document', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, color: Color(0xFF38BDF8), size: 24),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'All medical documents are encrypted and strictly isolated to your account. Extracted information is non-diagnostic.',
                      style: TextStyle(color: Colors.white70, fontSize: 12.5),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Quick Samples / Format Selector
            const Text(
              'Select Report Sample or Source:',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _templates.keys.map((title) {
                final isSelected = _selectedTemplate == title;
                return ChoiceChip(
                  label: Text(title),
                  selected: isSelected,
                  selectedColor: const Color(0xFF38BDF8),
                  backgroundColor: const Color(0xFF1E293B),
                  labelStyle: TextStyle(
                    color: isSelected ? const Color(0xFF0F172A) : Colors.white70,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedTemplate = title;
                        _textController.text = _templates[title]!;
                      });
                    }
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Text Preview / Editor Box
            const Text(
              'Document OCR Content:',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: TextField(
                controller: _textController,
                maxLines: 10,
                style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 12.5),
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.all(14),
                  border: InputBorder.none,
                  hintText: 'Paste OCR text or enter document test parameters...',
                  hintStyle: TextStyle(color: Colors.white38),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Progress Indicator when uploading
            if (isUploading) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF38BDF8)),
                ),
                child: Column(
                  children: [
                    const LinearProgressIndicator(
                      backgroundColor: Colors.white12,
                      color: Color(0xFF38BDF8),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      uploadStatus,
                      style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.w600, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (_controller.errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFEF4444)),
                ),
                child: Text(
                  _controller.errorMessage!,
                  style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: isUploading ? null : _handleUpload,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF38BDF8),
                  foregroundColor: const Color(0xFF0F172A),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.cloud_upload_rounded),
                label: const Text(
                  'Analyze & Process Document',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
