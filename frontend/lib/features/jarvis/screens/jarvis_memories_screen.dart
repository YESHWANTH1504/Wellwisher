import 'package:flutter/material.dart';
import '../models/personalization_models.dart';
import '../services/personalization_api_service.dart';

class JarvisMemoriesScreen extends StatefulWidget {
  final PersonalizationApiService? apiService;

  const JarvisMemoriesScreen({super.key, this.apiService});

  @override
  State<JarvisMemoriesScreen> createState() => _JarvisMemoriesScreenState();
}

class _JarvisMemoriesScreenState extends State<JarvisMemoriesScreen> {
  late final PersonalizationApiService _apiService;
  List<AiMemoryItemModel> _memories = [];
  bool _isLoading = true;
  String _selectedSourceFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? PersonalizationApiService();
    _loadMemories();
  }

  Future<void> _loadMemories() async {
    setState(() => _isLoading = true);
    final mems = await _apiService.getMemories();
    if (mounted) {
      setState(() {
        _memories = mems;
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteMemory(int id) async {
    final success = await _apiService.deleteMemory(id);
    if (success && mounted) {
      setState(() {
        _memories.removeWhere((m) => m.id == id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Memory deleted.')),
      );
    }
  }

  Future<void> _clearInferred() async {
    final count = await _apiService.clearMemories(inferredOnly: true);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Cleared $count learned memories.')),
      );
      _loadMemories();
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedSourceFilter == 'ALL'
        ? _memories
        : _memories.where((m) => _selectedSourceFilter == 'EXPLICIT' ? m.source == 'USER_EXPLICIT' : m.source == 'AGENT_INFERRED').toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('JARVIS Memory Management', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white),
            color: const Color(0xFF1E293B),
            onSelected: (val) {
              if (val == 'clear_inferred') _clearInferred();
              if (val == 'refresh') _loadMemories();
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'refresh', child: Text('Refresh', style: TextStyle(color: Colors.white))),
              PopupMenuItem(value: 'clear_inferred', child: Text('Clear Learned Habits', style: TextStyle(color: Color(0xFFF87171)))),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF1E293B),
            child: Row(
              children: [
                _buildFilterChip('All (${_memories.length})', 'ALL'),
                const SizedBox(width: 8),
                _buildFilterChip('You Said', 'EXPLICIT'),
                const SizedBox(width: 8),
                _buildFilterChip('Learned Habits', 'INFERRED'),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                : filtered.isEmpty
                    ? const Center(
                        child: Text(
                          'No memories recorded yet.',
                          style: TextStyle(color: Colors.white54, fontSize: 14),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final mem = filtered[index];
                          final isExplicit = mem.source == 'USER_EXPLICIT';
                          return Container(
                            margin: const EdgeInsets.symmetric(vertical: 6),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isExplicit ? const Color(0xFF6366F1).withValues(alpha: 0.3) : const Color(0xFF10B981).withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  isExplicit ? Icons.person_pin_rounded : Icons.psychology_rounded,
                                  color: isExplicit ? const Color(0xFF818CF8) : const Color(0xFF34D399),
                                  size: 22,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        mem.memoryValue,
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: (isExplicit ? const Color(0xFF6366F1) : const Color(0xFF10B981)).withValues(alpha: 0.2),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              isExplicit ? 'Explicit Statement' : 'Learned Habit (${(mem.confidenceScore * 100).toInt()}% Conf.)',
                                              style: TextStyle(
                                                color: isExplicit ? const Color(0xFF818CF8) : const Color(0xFF34D399),
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Key: ${mem.memoryKey}',
                                            style: const TextStyle(color: Colors.white38, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.white38, size: 20),
                                  onPressed: () => _deleteMemory(mem.id),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedSourceFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedSourceFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF6366F1) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? const Color(0xFF818CF8) : Colors.white12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white60,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
