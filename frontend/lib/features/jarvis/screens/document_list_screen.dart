import 'package:flutter/material.dart';
import '../controller/document_controller.dart';
import '../models/document_models.dart';
import 'document_upload_screen.dart';
import 'document_detail_screen.dart';
import 'document_comparison_screen.dart';

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
    {'label': 'All', 'value': null},
    {'label': 'Blood Reports', 'value': 'BLOOD_REPORT'},
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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('JARVIS Health Documents', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          if (docs.length >= 2)
            IconButton(
              icon: const Icon(Icons.compare_arrows_rounded, color: Color(0xFF38BDF8)),
              tooltip: 'Compare Reports',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DocumentComparisonScreen()),
                );
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search documents by test or filename...',
                  hintStyle: const TextStyle(color: Colors.white38),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF38BDF8)),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Colors.white38),
                          onPressed: () {
                            _searchController.clear();
                            _controller.search('');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onSubmitted: (val) => _controller.search(val),
              ),
            ),
          ),

          // Category Chips
          SizedBox(
            height: 42,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = selectedFilter == cat['value'];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: FilterChip(
                    label: Text(cat['label']!),
                    selected: isSelected,
                    selectedColor: const Color(0xFF38BDF8),
                    backgroundColor: const Color(0xFF1E293B),
                    labelStyle: TextStyle(
                      color: isSelected ? const Color(0xFF0F172A) : Colors.white70,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (_) => _controller.filterByType(cat['value']),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 6),

          // Document List
          Expanded(
            child: isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
                : docs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.folder_open_rounded, size: 54, color: Colors.white.withValues(alpha: 0.3)),
                            const SizedBox(height: 12),
                            const Text(
                              'No documents uploaded yet',
                              style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Upload a blood report or prescription to start.',
                              style: TextStyle(color: Colors.white38, fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => _controller.loadDocuments(),
                        color: const Color(0xFF38BDF8),
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: docs.length,
                          itemBuilder: (context, index) {
                            final doc = docs[index];
                            return _buildDocumentCard(doc);
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF38BDF8),
        foregroundColor: const Color(0xFF0F172A),
        icon: const Icon(Icons.add_a_photo_rounded),
        label: const Text('Scan Document', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
          );
          if (res == true) {
            _controller.loadDocuments();
          }
        },
      ),
    );
  }

  Widget _buildDocumentCard(AiDocumentModel doc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Material(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          leading: CircleAvatar(
            backgroundColor: const Color(0xFF38BDF8).withValues(alpha: 0.15),
            child: Icon(doc.typeIcon, color: const Color(0xFF38BDF8), size: 22),
          ),
          title: Text(
            doc.originalFilename,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14.5),
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                Text(
                  doc.displayType,
                  style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w500),
                ),
                const SizedBox(width: 8),
                Text(
                  '• ${doc.formattedFileSize}',
                  style: const TextStyle(color: Colors.white38, fontSize: 12),
                ),
              ],
            ),
          ),
          trailing: const Icon(Icons.chevron_right, color: Colors.white38),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => DocumentDetailScreen(
                  documentId: doc.id,
                  initialDocument: doc,
                ),
              ),
            );
            _controller.loadDocuments();
          },
        ),
      ),
    );
  }
}
