import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/personalization_models.dart';
import '../services/personalization_api_service.dart';

/// Futuristic JARVIS Semantic Memory Matrix.
/// Displays explicit facts, inferred habits, confidence scores, and source provenance.
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
        const SnackBar(
          content: Text('JARVIS removed memory from semantic storage.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
    }
  }

  Future<void> _clearInferred() async {
    final count = await _apiService.clearMemories(inferredOnly: true);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cleared $count learned inferred habits.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
      _loadMemories();
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedSourceFilter == 'ALL'
        ? _memories
        : _memories.where((m) => _selectedSourceFilter == 'EXPLICIT'
            ? m.source == 'USER_EXPLICIT'
            : m.source == 'AGENT_INFERRED').toList();

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
            Text('JARVIS Memory Management', style: JarvisTypography.titleMedium),
            Text('Learned Knowledge & Context Matrix', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.cyan)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
            tooltip: 'Sync Memory',
            onPressed: _loadMemories,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: JarvisColors.textSecondary),
            color: JarvisColors.surfaceElevated,
            onSelected: (val) {
              if (val == 'clear_inferred') _clearInferred();
              if (val == 'refresh') _loadMemories();
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'refresh',
                child: Text('Refresh Memory Matrix', style: JarvisTypography.bodyMedium),
              ),
              PopupMenuItem(
                value: 'clear_inferred',
                child: Text('Forget Learned Habits', style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.rose)),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Header telemetry card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: JarvisColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: JarvisColors.cyan.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.psychology, color: JarvisColors.cyan, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('PERSISTENT CONTEXT ENGINE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                      const SizedBox(height: 2),
                      Text(
                        'JARVIS maintains factual preferences and learned behavioral patterns to assist your daily life autonomously.',
                        style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildFilterChip('All (${_memories.length})', 'ALL'),
                const SizedBox(width: 8),
                _buildFilterChip('Direct Input', 'EXPLICIT'),
                const SizedBox(width: 8),
                _buildFilterChip('Learned Habits', 'INFERRED'),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Memory Items List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 48, color: JarvisColors.textDisabled),
                            const SizedBox(height: 12),
                            Text('No memory vectors found.', style: JarvisTypography.bodyLarge.copyWith(color: JarvisColors.textSecondary)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: filtered.length,
                        itemBuilder: (context, idx) {
                          final mem = filtered[idx];
                          return _buildMemoryCard(mem);
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
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? JarvisColors.cyan.withValues(alpha: 0.15) : JarvisColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? JarvisColors.cyan : JarvisColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: JarvisTypography.bodySmall.copyWith(
            color: isSelected ? JarvisColors.cyan : JarvisColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildMemoryCard(AiMemoryItemModel mem) {
    final isExplicit = mem.source == 'USER_EXPLICIT';
    final badgeColor = isExplicit ? JarvisColors.cyan : JarvisColors.indigo;
    final badgeLabel = isExplicit ? 'Explicit Statement' : 'Learned Habit';
    final confidence = (mem.confidenceScore * 100).toInt();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: badgeColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isExplicit ? Icons.person : Icons.auto_awesome,
                      size: 12,
                      color: badgeColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      badgeLabel,
                      style: JarvisTypography.labelSmall.copyWith(
                        color: badgeColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  Text(
                    'Confidence: $confidence%',
                    style: JarvisTypography.monospace.copyWith(
                      color: JarvisColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: JarvisColors.rose),
                    tooltip: 'Forget Memory',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => _deleteMemory(mem.id),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            mem.memoryValue,
            style: JarvisTypography.bodyLarge.copyWith(color: JarvisColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.category_outlined, size: 12, color: JarvisColors.textDisabled),
              const SizedBox(width: 4),
              Text(
                'Key: ${mem.memoryKey}',
                style: JarvisTypography.monospace.copyWith(color: JarvisColors.textDisabled, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
