import 'package:flutter/material.dart';
import '../models/document_models.dart';
import '../services/document_api_service.dart';

class DocumentController extends ChangeNotifier {
  final DocumentApiService _apiService;

  List<AiDocumentModel> _documents = [];
  bool _isLoading = false;
  bool _isUploading = false;
  String _uploadStatus = '';
  String? _selectedFilter;
  String _searchQuery = '';
  String? _errorMessage;

  DocumentController({DocumentApiService? apiService})
      : _apiService = apiService ?? DocumentApiService();

  List<AiDocumentModel> get documents => _documents;
  bool get isLoading => _isLoading;
  bool get isUploading => _isUploading;
  String get uploadStatus => _uploadStatus;
  String? get selectedFilter => _selectedFilter;
  String get searchQuery => _searchQuery;
  String? get errorMessage => _errorMessage;

  Future<void> loadDocuments() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      if (_searchQuery.isNotEmpty) {
        _documents = await _apiService.searchDocuments(_searchQuery);
      } else {
        _documents = await _apiService.getDocuments(documentType: _selectedFilter);
      }
    } catch (e) {
      _errorMessage = 'Failed to load documents: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void filterByType(String? type) {
    _selectedFilter = type;
    _searchQuery = '';
    loadDocuments();
  }

  void search(String query) {
    _searchQuery = query.trim();
    loadDocuments();
  }

  Future<bool> uploadDocument({
    List<int>? bytes,
    String? filename,
    String? mimeType,
    String? ocrText,
    String? fileBase64,
  }) async {
    _isUploading = true;
    _uploadStatus = 'Uploading file to secure server...';
    _errorMessage = null;
    notifyListeners();

    try {
      await Future.delayed(const Duration(milliseconds: 300));
      _uploadStatus = 'Extracting OCR and reading document text...';
      notifyListeners();

      final res = await _apiService.uploadDocument(
        bytes: bytes,
        filename: filename,
        mimeType: mimeType,
        ocrText: ocrText,
        fileBase64: fileBase64,
      );

      _uploadStatus = 'Normalizing clinical metrics and applying safety checks...';
      notifyListeners();

      if (res['success'] == true) {
        _uploadStatus = 'Completed';
        await loadDocuments();
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Document processing failed.';
        return false;
      }
    } catch (e) {
      _errorMessage = 'Upload error: $e';
      return false;
    } finally {
      _isUploading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteDocument(String id) async {
    final success = await _apiService.deleteDocument(id);
    if (success) {
      _documents.removeWhere((d) => d.id == id);
      notifyListeners();
    }
    return success;
  }
}
