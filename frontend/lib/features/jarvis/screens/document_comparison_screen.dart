import 'package:flutter/material.dart';
import '../models/document_models.dart';
import '../services/document_api_service.dart';
import '../widgets/document_comparison_card.dart';

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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select two different reports to compare.')),
      );
      return;
    }

    setState(() {
      _isComparing = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiService.compareDocuments(_selectedLatestId!, _selectedPreviousId!);
      if (mounted) {
        setState(() {
          _comparison = res;
          _isComparing = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Comparison failed: $e';
          _isComparing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Compare Reports', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: _isLoadingDocs
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF818CF8)))
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
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Select Two Reports to Compare:',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 12),

                        // Latest Report Dropdown
                        const Text('Latest Report (Primary):', style: TextStyle(color: Colors.white70, fontSize: 12)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedLatestId,
                              isExpanded: true,
                              dropdownColor: const Color(0xFF1E293B),
                              style: const TextStyle(color: Colors.white, fontSize: 13),
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
                        const Text('Previous Report (Baseline):', style: TextStyle(color: Colors.white70, fontSize: 12)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedPreviousId,
                              isExpanded: true,
                              dropdownColor: const Color(0xFF1E293B),
                              style: const TextStyle(color: Colors.white, fontSize: 13),
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

                  if (_isComparing) ...[
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32.0),
                        child: CircularProgressIndicator(color: Color(0xFF818CF8)),
                      ),
                    ),
                  ] else if (_comparison != null) ...[
                    DocumentComparisonCard(comparison: _comparison!),
                  ] else if (_availableDocs.length < 2) ...[
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text(
                          'You need at least two uploaded reports to perform historical comparisons.',
                          style: TextStyle(color: Colors.white70),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
