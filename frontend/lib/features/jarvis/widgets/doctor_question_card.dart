import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DoctorQuestionCard extends StatelessWidget {
  final String question;
  final int index;

  const DoctorQuestionCard({
    super.key,
    required this.question,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: Colors.teal.shade100,
              child: Text(
                '$index',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.teal.shade900),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                question,
                style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.copy, size: 16, color: Colors.grey),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              tooltip: 'Copy Question',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: question));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Question copied to clipboard'),
                    duration: Duration(seconds: 2),
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
