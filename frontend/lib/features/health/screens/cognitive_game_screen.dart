import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/api_client.dart';

class CognitiveGameScreen extends StatefulWidget {
  const CognitiveGameScreen({super.key});

  @override
  State<CognitiveGameScreen> createState() => _CognitiveGameScreenState();
}

class _CognitiveGameScreenState extends State<CognitiveGameScreen> {
  final ApiClient _apiClient = ApiClient();

  final List<String> _cardIcons = [
    '🍎', '🍎',
    '💧', '💧',
    '💊', '💊',
    '☀️', '☀️',
    '🧘', '🧘',
    '🧠', '🧠',
  ];

  late List<String> _shuffledCards;
  late List<bool> _cardFlipped;
  late List<bool> _cardMatched;

  int _firstSelectedIndex = -1;
  bool _isProcessing = false;
  int _moves = 0;
  int _matchedPairs = 0;
  int _secondsElapsed = 0;
  Timer? _timer;
  bool _gameCompleted = false;

  @override
  void initState() {
    super.initState();
    _startNewGame();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startNewGame() {
    _timer?.cancel();
    _shuffledCards = List.from(_cardIcons)..shuffle();
    _cardFlipped = List.generate(_shuffledCards.length, (_) => false);
    _cardMatched = List.generate(_shuffledCards.length, (_) => false);
    _firstSelectedIndex = -1;
    _isProcessing = false;
    _moves = 0;
    _matchedPairs = 0;
    _secondsElapsed = 0;
    _gameCompleted = false;

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_gameCompleted) {
        setState(() => _secondsElapsed++);
      }
    });
  }

  void _onCardTap(int index) {
    if (_isProcessing || _cardFlipped[index] || _cardMatched[index]) return;

    setState(() {
      _cardFlipped[index] = true;
    });

    if (_firstSelectedIndex == -1) {
      _firstSelectedIndex = index;
    } else {
      _moves++;
      _isProcessing = true;
      int secondIndex = index;

      if (_shuffledCards[_firstSelectedIndex] == _shuffledCards[secondIndex]) {
        // Match found!
        setState(() {
          _cardMatched[_firstSelectedIndex] = true;
          _cardMatched[secondIndex] = true;
          _matchedPairs++;
          _firstSelectedIndex = -1;
          _isProcessing = false;
        });

        if (_matchedPairs == _cardIcons.length ~/ 2) {
          _onGameComplete();
        }
      } else {
        // No match - turn back after 800ms
        Future.delayed(const Duration(milliseconds: 800), () {
          if (mounted) {
            setState(() {
              _cardFlipped[_firstSelectedIndex] = false;
              _cardFlipped[secondIndex] = false;
              _firstSelectedIndex = -1;
              _isProcessing = false;
            });
          }
        });
      }
    }
  }

  Future<void> _onGameComplete() async {
    _timer?.cancel();
    setState(() => _gameCompleted = true);

    int score = (1000 / (_moves + 1) + 100 / (_secondsElapsed + 1)).round();
    score = score.clamp(10, 100);

    try {
      await _apiClient.post('/api/ai/save-game-score', {
        'gameType': 'Memory Match',
        'score': score,
        'durationSeconds': _secondsElapsed
      });
    } catch (e) {
      // Handled silently
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Brain Training & Memory Games 🧠'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.primary.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text('Moves', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('$_moves', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                  Column(
                    children: [
                      const Text('Time', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('${_secondsElapsed}s', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                  Column(
                    children: [
                      const Text('Matches', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('$_matchedPairs/6', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_gameCompleted) ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.green),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.stars, color: Colors.amber, size: 56),
                    const SizedBox(height: 8),
                    const Text('Brain Sharpness Rating: Excellent! 🌟', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text('You matched all pairs in $_moves moves and $_secondsElapsed seconds!'),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _startNewGame,
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      label: const Text('Play Again', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: _shuffledCards.length,
              itemBuilder: (context, index) {
                bool isVisible = _cardFlipped[index] || _cardMatched[index];
                return GestureDetector(
                  onTap: () => _onCardTap(index),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      color: isVisible ? Colors.white : AppColors.primary,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        )
                      ],
                      border: Border.all(
                        color: _cardMatched[index] ? Colors.green : AppColors.primary.withOpacity(0.3),
                        width: _cardMatched[index] ? 2 : 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        isVisible ? _shuffledCards[index] : '🧠',
                        style: TextStyle(fontSize: isVisible ? 36 : 28),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
