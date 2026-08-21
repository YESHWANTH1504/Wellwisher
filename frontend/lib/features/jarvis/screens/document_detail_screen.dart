import 'package:flutter/material.dart';
import '../models/document_models.dart';
import '../services/document_api_service.dart';
import '../widgets/document_summary_card.dart';
import '../widgets/extracted_value_card.dart';
import '../widgets/document_source_viewer.dart';
import 'document_comparison_screen.dart';

class DocumentDetailScreen extends StatefulWidget {
  final String documentId;
  final AiDocumentModel? initialDocument;
  final DocumentApiService? apiService;

  const DocumentDetailScreen({
    super.key,
    required this.documentId,
    this.initialDocument,
    this.apiService,
  });

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  late final DocumentApiService _apiService;
  AiDocumentModel? _document;
  DocumentSummaryModel? _summary;
  List<AiExtractedValueModel> _extractions = [];
  List<dynamic> _pages = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _activeTab = 'Summary';

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? DocumentApiService();
    _document = widget.initialDocument;
    _loadDocumentDetails();
  }

  Future<void> _loadDocumentDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final docFuture = _document != null ? Future.value(_document) : _apiService.getDocument(widget.documentId);
      final sumFuture = _apiService.getDocumentSummary(widget.documentId);
      final extFuture = _apiService.getDocumentExtraction(widget.documentId);

      final results = await Future.wait([docFuture, sumFuture, extFuture]);

      if (mounted) {
        setState(() {
          _document = results[0] as AiDocumentModel?;
          _summary = results[1] as DocumentSummaryModel?;
          final extData = results[2] as Map<String, dynamic>;
          _extractions = extData['extractions'] as List<AiExtractedValueModel>;
          _pages = extData['pages'] as List<dynamic>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load details: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Delete Document & Records?', style: TextStyle(color: Colors.white)),
        content: Text(
          'This will permanently delete "${_document?.originalFilename ?? 'this document'}", all OCR transcripts, extracted metrics, and clinical summaries.',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete Permanently', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _apiService.deleteDocument(widget.documentId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document and clinical records deleted.')),
        );
        Navigator.pop(context, true);
      }
    }
  }

  void _openSourceViewer(int pageNum, String? snippet) {
    final page = _pages.firstWhere(
      (p) => (p is Map && p['pageNumber'] == pageNum) || (p is Map && p['page_number'] == pageNum),
      orElse: () => {'ocrText': _extractions.map((e) => e.sourceText).where((t) => t != null).join('\n')},
    );

    final rawText = (page is Map ? (page['ocrText'] ?? page['ocr_text']) : '')?.toString() ?? '';

    DocumentSourceViewerModal.show(
      context,
      filename: _document?.originalFilename ?? 'Document',
      pageNumber: pageNum,
      ocrText: rawText,
      highlightedSnippet: snippet,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text(
          _document?.originalFilename ?? 'Document Details',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444)),
            tooltip: 'Delete Document',
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
          : RefreshIndicator(
              onRefresh: _loadDocumentDetails,
              color: const Color(0xFF38BDF8),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Document Meta Badge Bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              _document?.displayType ?? 'Document',
                              style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _document?.formattedFileSize ?? '',
                            style: const TextStyle(color: Colors.white38, fontSize: 12),
                          ),
                          const Spacer(),
                          Text(
                            _document?.processingStatus ?? '',
                            style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                        ],
                      ),
                    ),

                    // Grounded Summary Card
                    if (_summary != null)
                      DocumentSummaryCard(summary: _summary!),

                    // Extracted Parameters Section
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          const Text(
                            'Extracted Clinical Parameters',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white12,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${_extractions.length}',
                              style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (_extractions.isEmpty) ...[
                      Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Text(
                            'No structured numeric metrics found in this document.',
                            style: TextStyle(color: Colors.white60),
                          ),
                        ),
                      ),
                    ] else ...[
                      ..._extractions.map((m) => ExtractedValueCard(
                        metric: m,
                        onTapSource: () => _openSourceViewer(m.pageNumber, m.sourceText),
                      )),
                    ],

                    const SizedBox(height: 16),

                    // Compare Reports Action Button
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => DocumentComparisonScreen(
                                  initialLatestId: widget.documentId,
                                ),
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF818CF8),
                            side: const BorderSide(color: Color(0xFF818CF8)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.compare_arrows_rounded),
                          label: const Text('Compare with Previous Report', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),

                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }
}
