import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/document_models.dart';
import '../services/document_api_service.dart';
import '../widgets/document_comparison_card.dart';

/// Futuristic JARVIS Document Comparison Screen.
/// Compares two longitudinal lab reports to compute exact numerical deltas and out-of-range shifts.
class DocumentComparisonScreen extends StatefulWidget {
  final String? initialLatestId;
  final String? initialPreviousId;
  final DocumentApiService? apiService;

  const DocumentComparisonScreen({
    super.key,
    this.initialLatestId,
    this.initialPreviousId,
    this.apiService,
  });

  @override
  State<DocumentComparisonScreen> createState() => _DocumentComparisonScreenState();
}

class _DocumentComparisonScreenState extends State<DocumentComparisonScreen> {
  late final DocumentApiService _apiService;
  List<AiDocumentModel> _availableDocs = [];
  String? _selectedLatestId;
  String? _selectedPreviousId;
  String? _errorMessage;
  DocumentComparisonModel? _comparison;
  bool _isLoadingDocs = true;
  bool _isComparing = false;

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? DocumentApiService();
    _selectedLatestId = widget.initialLatestId;
    _selectedPreviousId = widget.initialPreviousId;
    _loadDocumentsAndCompare();
  }

  Future<void> _loadDocumentsAndCompare() async {
    setState(() => _isLoadingDocs = true);
    try {
      final docs = await _apiService.getDocuments();
      if (mounted) {
        setState(() {
          _availableDocs = docs;
          if (_selectedLatestId == null && docs.isNotEmpty) {
            _selectedLatestId = docs.first.id;
          }
          if (_selectedPreviousId == null && docs.length > 1) {
            _selectedPreviousId = docs[1].id;
          }
          _isLoadingDocs = false;
        });

        if (_selectedLatestId != null && _selectedPreviousId != null) {
          _executeComparison();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load documents: $e';
          _isLoadingDocs = false;
        });
      }
    }
  }

  Future<void> _executeComparison() async {
    if (_selectedLatestId == null || _selectedPreviousId == null) return;
    if (_selectedLatestId == _selectedPreviousId) {
      setState(() => _comparison = null);
      return;
    }

    setState(() {
      _isComparing = true;
      _errorMessage = null;
    });

    try {
      final comp = await _apiService.compareDocuments(_selectedLatestId!, _selectedPreviousId!);
      if (mounted) {
        setState(() {
          _comparison = comp;
          _isComparing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Comparison computation failed: $e';
          _isComparing = false;
        });
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
            Text('LONGITUDINAL DIFFERENTIAL', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            Text('Report Comparison Matrix', style: JarvisTypography.titleMedium),
          ],
        ),
      ),
      body: _isLoadingDocs
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_errorMessage!, style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.rose)),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Selectors Box
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: JarvisColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: JarvisColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'SELECT TWO CLINICAL REPORTS TO COMPARE',
                              style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan),
                            ),
                            const SizedBox(height: 12),

                            // Latest Report Dropdown
                            Text('Latest Report (Current Reference):', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: JarvisColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: JarvisColors.border),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedLatestId,
                                  isExpanded: true,
                                  dropdownColor: JarvisColors.surfaceElevated,
                                  style: JarvisTypography.bodyMedium,
                                  items: _availableDocs.map((d) {
                                    return DropdownMenuItem(
                                      value: d.id,
                                      child: Text('${d.originalFilename} (${d.displayType})'),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    setState(() => _selectedLatestId = val);
                                    _executeComparison();
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Previous Report Dropdown
                            Text('Previous Report (Baseline Baseline):', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: JarvisColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: JarvisColors.border),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: _selectedPreviousId,
                                  isExpanded: true,
                                  dropdownColor: JarvisColors.surfaceElevated,
                                  style: JarvisTypography.bodyMedium,
                                  items: _availableDocs.map((d) {
                                    return DropdownMenuItem(
                                      value: d.id,
                                      child: Text('${d.originalFilename} (${d.displayType})'),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    setState(() => _selectedPreviousId = val);
                                    _executeComparison();
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Results Area
                      if (_isComparing)
                        const Padding(
                          padding: EdgeInsets.all(40),
                          child: Center(
                            child: Column(
                              children: [
                                CircularProgressIndicator(color: JarvisColors.cyan),
                                SizedBox(height: 16),
                                Text('Computing biomarker differentials...', style: TextStyle(color: JarvisColors.cyan)),
                              ],
                            ),
                          ),
                        )
                      else if (_selectedLatestId == _selectedPreviousId)
                        Container(
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: JarvisColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: JarvisColors.border),
                          ),
                          child: Center(
                            child: Text(
                              'Please select two distinct reports to compute differentials.',
                              style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.textSecondary),
                            ),
                          ),
                        )
                      else if (_comparison != null)
                        DocumentComparisonCard(comparison: _comparison!)
                      else
                        Container(
                          margin: const EdgeInsets.all(16),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: JarvisColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: JarvisColors.border),
                          ),
                          child: Center(
                            child: Text(
                              'No comparison data available for the selected reports.',
                              style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.textSecondary),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }
}
