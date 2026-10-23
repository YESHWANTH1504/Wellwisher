import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../controller/document_controller.dart';
import 'document_detail_screen.dart';

/// Futuristic "GIVE TO JARVIS" Document Intelligence Laboratory.
/// Multi-modal report intake, OCR scan visualizer, and structured biomarker extraction.
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
        const SnackBar(
          content: Text('Please select or paste report text to give to JARVIS.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
      return;
    }

    final success = await _controller.uploadDocument(
      ocrText: text,
      filename: _selectedTemplate,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('JARVIS extracted clinical parameters with page traceability.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
      if (_controller.documents.isNotEmpty) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => DocumentDetailScreen(
              documentId: _controller.documents.first.id,
              initialDocument: _controller.documents.first,
            ),
          ),
        );
      } else {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: JarvisColors.cyan, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('DOCUMENT INTELLIGENCE LAB', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            Text('Give to JARVIS', style: JarvisTypography.titleMedium),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Multimodal intake banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: JarvisColors.cyan.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.document_scanner_rounded, color: JarvisColors.cyan, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AUTONOMOUS MULTIMODAL INTAKE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                        const SizedBox(height: 2),
                        Text(
                          'JARVIS parses OCR documents, extracts numerical biomarkers, verifies printed reference ranges, and flags deviations.',
                          style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Select Sample Template
            Text('SELECT CLINICAL DOCUMENT TEMPLATE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.indigo)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: JarvisColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedTemplate,
                  isExpanded: true,
                  dropdownColor: JarvisColors.surfaceElevated,
                  icon: const Icon(Icons.keyboard_arrow_down, color: JarvisColors.cyan),
                  items: _templates.keys.map((t) {
                    return DropdownMenuItem<String>(
                      value: t,
                      child: Text(t, style: JarvisTypography.bodyMedium),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedTemplate = val;
                        _textController.text = _templates[val]!;
                      });
                    }
                  },
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Document Content Editor / OCR Viewer
            Text('DOCUMENT CONTENT / OCR STREAM', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: JarvisColors.border),
              ),
              child: TextField(
                controller: _textController,
                maxLines: 12,
                style: JarvisTypography.monospace.copyWith(fontSize: 12, color: JarvisColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Paste OCR medical report text here...',
                  hintStyle: TextStyle(color: JarvisColors.textDisabled),
                  contentPadding: EdgeInsets.all(16),
                  border: InputBorder.none,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Action Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _controller.isLoading ? null : _handleUpload,
                icon: _controller.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : const Icon(Icons.bolt, color: Colors.black),
                label: Text(
                  _controller.isLoading ? 'JARVIS ANALYZING REPORT...' : 'GIVE TO JARVIS & EXTRACT',
                  style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: JarvisColors.cyan,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
