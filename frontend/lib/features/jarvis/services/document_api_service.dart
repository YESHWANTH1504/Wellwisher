import 'dart:convert';
import '../../../services/api_client.dart';
import '../models/document_models.dart';

class DocumentApiService {
  final ApiClient _client;

  DocumentApiService({ApiClient? client}) : _client = client ?? ApiClient();

  /// List all documents for the authenticated user
  Future<List<AiDocumentModel>> getDocuments({String? documentType}) async {
    final queryParam = (documentType != null && documentType.isNotEmpty) ? '?documentType=$documentType' : '';
    final res = await _client.get('/ai/documents$queryParam');

    if (res['success'] == true && res['data'] is List) {
      final list = res['data'] as List<dynamic>;
      return list.map((item) => AiDocumentModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
    }
    return [];
  }

  /// Search user documents
  Future<List<AiDocumentModel>> searchDocuments(String query) async {
    final res = await _client.get('/ai/documents/search?query=${Uri.encodeComponent(query)}');
    if (res['success'] == true && res['data'] is List) {
      final list = res['data'] as List<dynamic>;
      return list.map((item) => AiDocumentModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
    }
    return [];
  }

  /// Get single document metadata
  Future<AiDocumentModel?> getDocument(String id) async {
    final res = await _client.get('/ai/documents/$id');
    if (res['success'] == true && res['data'] != null) {
      return AiDocumentModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
    }
    return null;
  }

  /// Get document summary
  Future<DocumentSummaryModel?> getDocumentSummary(String id) async {
    final res = await _client.get('/ai/documents/$id/summary');
    if (res['success'] == true && res['data'] != null) {
      return DocumentSummaryModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
    }
    return null;
  }

  /// Get document extractions
  Future<Map<String, dynamic>> getDocumentExtraction(String id) async {
    final res = await _client.get('/ai/documents/$id/extraction');
    if (res['success'] == true && res['data'] != null) {
      final data = res['data'] as Map<String, dynamic>;
      final rawExts = data['extractions'] as List<dynamic>? ?? [];
      final extractions = rawExts
          .map((e) => AiExtractedValueModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      return {
        'document': data['document'] != null ? AiDocumentModel.fromJson(Map<String, dynamic>.from(data['document'] as Map)) : null,
        'extractions': extractions,
        'pages': data['pages'] ?? []
      };
    }
    return {'document': null, 'extractions': <AiExtractedValueModel>[], 'pages': []};
  }

  /// Upload document with binary bytes or OCR text
  Future<Map<String, dynamic>> uploadDocument({
    List<int>? bytes,
    String? filename,
    String? mimeType,
    String? ocrText,
    String? fileBase64,
  }) async {
    final payload = <String, dynamic>{
      'originalFilename': filename ?? 'document.pdf',
      'mimeType': mimeType ?? 'application/pdf',
    };

    if (ocrText != null && ocrText.isNotEmpty) {
      payload['ocrText'] = ocrText;
    } else if (fileBase64 != null && fileBase64.isNotEmpty) {
      payload['fileBase64'] = fileBase64;
    } else if (bytes != null && bytes.isNotEmpty) {
      payload['fileBase64'] = base64Encode(bytes);
    }

    final res = await _client.post('/ai/documents/upload', payload);
    return res;
  }

  /// Compare two documents
  Future<DocumentComparisonModel?> compareDocuments(String latestDocumentId, String previousDocumentId) async {
    final res = await _client.post('/ai/documents/compare', {
      'latestDocumentId': latestDocumentId,
      'previousDocumentId': previousDocumentId,
    });

    if (res['success'] == true && res['data'] != null) {
      return DocumentComparisonModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
    }
    return null;
  }

  /// Confirm or update extraction status
  Future<bool> confirmExtraction(String docId, String extractionId, {String status = 'CONFIRMED'}) async {
    final res = await _client.post('/ai/documents/$docId/confirm', {
      'extractionId': extractionId,
      'status': status,
    });
    return res['success'] == true;
  }

  /// Delete document
  Future<bool> deleteDocument(String id) async {
    final res = await _client.delete('/ai/documents/$id');
    return res['success'] == true;
  }

  /// Clear all documents
  Future<bool> clearAllDocuments() async {
    final res = await _client.post('/ai/documents/clear', {});
    return res['success'] == true;
  }
}
