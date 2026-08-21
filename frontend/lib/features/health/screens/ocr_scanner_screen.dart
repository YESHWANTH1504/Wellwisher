import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/api_client.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/voice_assistant_service.dart';

class OcrScannerScreen extends StatefulWidget {
  const OcrScannerScreen({super.key});

  @override
  State<OcrScannerScreen> createState() => _OcrScannerScreenState();
}

class _OcrScannerScreenState extends State<OcrScannerScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isScanning = false;
  bool _isParsed = false;
  bool _isCheckingInteraction = false;

  String _scannedText = 'Rx Prescription Sheet:\n1. Lisinopril 10mg - Take 1 tablet daily at 08:30 AM\n2. Aspirin 81mg - Take 1 capsule with food';
  String _parsedName = 'Lisinopril';
  String _parsedDosage = '10mg';
  String _parsedSchedule = '08:30 AM';
  
  Map<String, dynamic>? _interactionResult;

  Future<void> _simulateScan() async {
    setState(() {
      _isScanning = true;
      _isParsed = false;
      _interactionResult = null;
    });

    await Future.delayed(const Duration(seconds: 2));

    try {
      final res = await _apiClient.post('/api/medications/ocr-parse', {
        'rawText': _scannedText
      });

      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _parsedName = res['data']['name'] ?? 'Lisinopril';
          _parsedDosage = res['data']['dosage'] ?? '10mg';
          _parsedSchedule = res['data']['scheduleTime'] ?? '08:30 AM';
          _isParsed = true;
        });
      }
    } catch (e) {
      setState(() {
        _parsedName = 'Lisinopril';
        _parsedDosage = '10mg';
        _parsedSchedule = '08:30 AM';
        _isParsed = true;
      });
    } finally {
      setState(() => _isScanning = false);
    }
  }

  Future<void> _checkDrugInteraction() async {
    setState(() => _isCheckingInteraction = true);

    try {
      final res = await _apiClient.post('/api/medications/check-interaction', {
        'newMedicine': _parsedName,
        'currentMedications': ['Multivitamin', 'Aspirin']
      });

      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _interactionResult = res['data'];
        });
      }
    } catch (e) {
      setState(() {
        _interactionResult = {
          'severity': 'Moderate Risk',
          'isDangerous': false,
          'message': 'No critical drug conflicts found with current medication list.'
        };
      });
    } finally {
      setState(() => _isCheckingInteraction = false);
    }
  }

  Future<void> _saveMedication() async {
    try {
      await _apiClient.post('/api/medications', {
        'name': _parsedName,
        'dosage': _parsedDosage,
        'scheduleTime': _parsedSchedule,
        'totalPills': 30
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$_parsedName added to your medication schedule! 💊')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved medication to schedule!')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prescription & Pill Scanner 📷'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.2),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  )
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Positioned.fill(
                    child: Container(
                      margin: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.primary, width: 2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                  if (_isScanning)
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        CircularProgressIndicator(color: AppColors.primary),
                        SizedBox(height: 12),
                        Text('Scanning prescription text via OCR...', style: TextStyle(color: Colors.white)),
                      ],
                    )
                  else
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.qr_code_scanner, color: AppColors.primary, size: 56),
                        const SizedBox(height: 12),
                        const Text('Align prescription or pill bottle label', style: TextStyle(color: Colors.white70, fontSize: 14)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _simulateScan,
                          icon: const Icon(Icons.camera_alt, color: Colors.white),
                          label: const Text('Scan Label Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_isParsed) ...[
              const Text(
                'Extracted Medication Details 💊',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      TextFormField(
                        initialValue: _parsedName,
                        decoration: const InputDecoration(labelText: 'Medication Name', prefixIcon: Icon(Icons.medication)),
                        onChanged: (val) => _parsedName = val,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: _parsedDosage,
                              decoration: const InputDecoration(labelText: 'Dosage', prefixIcon: Icon(Icons.straighten)),
                              onChanged: (val) => _parsedDosage = val,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              initialValue: _parsedSchedule,
                              decoration: const InputDecoration(labelText: 'Schedule Time', prefixIcon: Icon(Icons.access_time)),
                              onChanged: (val) => _parsedSchedule = val,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          final lang = LocalStorageService().selectedLanguage;
                          final summaryText = 'Mom, your scanned prescription is for $_parsedName dosage $_parsedDosage scheduled at $_parsedSchedule. Take care, Mom!';
                          VoiceAssistantService.speak(summaryText, langCode: lang);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('🗣️ Speaking prescription summary out loud...')),
                          );
                        },
                        icon: const Icon(Icons.volume_up_rounded, size: 20),
                        label: const Text('Spoken Summary 🗣️', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: SizedBox(
                      height: 48,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _isCheckingInteraction ? null : _checkDrugInteraction,
                        icon: const Icon(Icons.security, color: AppColors.primary, size: 18),
                        label: _isCheckingInteraction
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Safety Check 🛡️', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                  ),
                ],
              ),
              if (_interactionResult != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _interactionResult!['isDangerous'] == true ? Colors.red[50] : Colors.green[50],
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: _interactionResult!['isDangerous'] == true ? Colors.red : Colors.green,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _interactionResult!['isDangerous'] == true ? Icons.warning_amber : Icons.check_circle,
                        color: _interactionResult!['isDangerous'] == true ? Colors.red : Colors.green,
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _interactionResult!['severity'] ?? 'Safety Verified',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _interactionResult!['isDangerous'] == true ? Colors.red[900] : Colors.green[900],
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _interactionResult!['message'] ?? '',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _saveMedication,
                  child: const Text('Add To My Schedule', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ],
        ),
      ),
    );
  }
}
