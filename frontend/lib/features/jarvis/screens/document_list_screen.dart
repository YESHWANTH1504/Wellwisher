import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../controller/document_controller.dart';
import '../models/document_models.dart';
import 'document_upload_screen.dart';
import 'document_detail_screen.dart';
import 'document_comparison_screen.dart';

/// Futuristic JARVIS Document Intelligence List screen.
/// Multimodal document management, parameter extraction status, and comparison analysis.
class DocumentListScreen extends StatefulWidget {
  final DocumentController? controller;

  const DocumentListScreen({super.key, this.controller});

  @override
  State<DocumentListScreen> createState() => _DocumentListScreenState();
}

class _DocumentListScreenState extends State<DocumentListScreen> {
  late final DocumentController _controller;
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, String?>> _categories = [
    {'label': 'All Documents', 'value': null},
    {'label': 'Blood Panels', 'value': 'BLOOD_REPORT'},
    {'label': 'Lab Reports', 'value': 'LAB_REPORT'},
    {'label': 'Prescriptions', 'value': 'PRESCRIPTION'},
    {'label': 'Medication Labels', 'value': 'MEDICATION_LABEL'},
    {'label': 'Vitals Reports', 'value': 'VITALS_REPORT'},
  ];

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? DocumentController();
    _controller.addListener(_onControllerUpdate);
    _controller.loadDocuments();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerUpdate);
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final docs = _controller.documents;
    final isLoading = _controller.isLoading;
    final selectedFilter = _controller.selectedFilter;

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
            Text('MULTIMODAL INTELLIGENCE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            Text('JARVIS Health Documents', style: JarvisTypography.titleMedium),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.compare_arrows, color: JarvisColors.cyan),
            tooltip: 'Compare Reports',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DocumentComparisonScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
            tooltip: 'Sync Documents',
            onPressed: () => _controller.loadDocuments(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: JarvisColors.cyan,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.document_scanner),
        label: const Text('Scan Document', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
        ),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Container(
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: JarvisColors.border),
              ),
              child: TextField(
                controller: _searchController,
                style: JarvisTypography.bodyMedium,
                decoration: InputDecoration(
                  hintText: 'Search documents, biomarkers, or clinics...',
                  hintStyle: TextStyle(color: JarvisColors.textDisabled),
                  prefixIcon: const Icon(Icons.search, color: JarvisColors.cyan),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: JarvisColors.textSecondary),
                          onPressed: () {
                            _searchController.clear();
                            _controller.search('');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                onChanged: (val) => _controller.search(val),
              ),
            ),
          ),

          // Categories Filter Row
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              itemBuilder: (context, idx) {
                final cat = _categories[idx];
                final isSelected = selectedFilter == cat['value'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
                  child: FilterChip(
                    label: Text(cat['label']!),
                    selected: isSelected,
                    selectedColor: JarvisColors.cyan.withValues(alpha: 0.2),
                    backgroundColor: JarvisColors.surface,
                    checkmarkColor: JarvisColors.cyan,
                    labelStyle: TextStyle(
                      color: isSelected ? JarvisColors.cyan : JarvisColors.textSecondary,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    side: BorderSide(
                      color: isSelected ? JarvisColors.cyan : JarvisColors.border,
                    ),
                    onSelected: (selected) {
                      _controller.filterByType(selected ? cat['value'] : null);
                    },
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Document List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
                : docs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 54, color: JarvisColors.textDisabled),
                            const SizedBox(height: 14),
                            Text('No documents found.', style: JarvisTypography.bodyLarge.copyWith(color: JarvisColors.textSecondary)),
                            const SizedBox(height: 8),
                            Text('Tap "+ Give to JARVIS" to scan or paste a report.', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textDisabled)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                        itemCount: docs.length,
                        itemBuilder: (context, idx) {
                          final doc = docs[idx];
                          return _buildDocumentCard(doc);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentCard(AiDocumentModel doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: JarvisColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: JarvisColors.cyan.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.description_outlined, color: JarvisColors.cyan, size: 24),
          ),
          title: Text(doc.originalFilename, style: JarvisTypography.titleSmall),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                '${doc.displayType} • Status: ${doc.processingStatus}',
                style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
              ),
              const SizedBox(height: 4),
              Text(
                'Uploaded: ${doc.uploadedAt.split('T')[0]} • ${doc.formattedFileSize}',
                style: JarvisTypography.monospace.copyWith(color: JarvisColors.textDisabled, fontSize: 11),
              ),
            ],
          ),
          trailing: const Icon(Icons.arrow_forward_ios, color: JarvisColors.cyan, size: 16),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => DocumentDetailScreen(
                documentId: doc.id,
                initialDocument: doc,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
