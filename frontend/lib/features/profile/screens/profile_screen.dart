import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../../main.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/sound_service.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback? onSettingsChanged;

  const ProfileScreen({super.key, this.onSettingsChanged});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final LocalStorageService _storage = LocalStorageService();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;
    final isLoggedIn = _storage.isLoggedIn;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & Settings'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: primaryColor.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: primaryColor,
                    child: const Icon(Icons.person, color: Colors.white, size: 30),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isLoggedIn ? 'WellWisher Member' : 'Guest User',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isLoggedIn ? 'Account active & synced' : 'Sign in to back up routines',
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (!isLoggedIn) ...[
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pushNamed(context, AppRoutes.login).then((_) => setState(() {}));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      child: const Text('Sign In', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 20),

            // AI Coach Banner Shortcut
            InkWell(
              onTap: () {
                Navigator.pushNamed(context, AppRoutes.aiCoach);
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Colors.teal, Colors.blueAccent]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.auto_awesome_rounded, color: Colors.amber, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('WellWisher AI Coach 🤖', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          SizedBox(height: 2),
                          Text('Ask health tips & generate Senior/Focus plans', style: TextStyle(color: Colors.white70, fontSize: 11)),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: Colors.white, size: 20),
                  ],
                ),
              ),
            ),

            // Account Status Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark
                    ? (_storage.isNormalWorker
                        ? Colors.teal.shade900.withValues(alpha: 0.35)
                        : Colors.purple.shade900.withValues(alpha: 0.35))
                    : (_storage.isNormalWorker ? Colors.teal.shade50 : Colors.purple.shade50),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark
                      ? (_storage.isNormalWorker ? Colors.teal.shade700 : Colors.purple.shade700)
                      : (_storage.isNormalWorker ? Colors.teal.shade200 : Colors.purple.shade200),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _storage.isNormalWorker ? Icons.badge_rounded : Icons.elderly_rounded,
                    color: isDark
                        ? (_storage.isNormalWorker ? Colors.tealAccent : Colors.purpleAccent)
                        : (_storage.isNormalWorker ? Colors.teal.shade800 : Colors.purple.shade800),
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _storage.isNormalWorker
                              ? '💼 Worker & Professional Profile'
                              : '👵 Senior Citizen Care Profile',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: isDark
                                ? (_storage.isNormalWorker ? Colors.tealAccent : Colors.purpleAccent)
                                : (_storage.isNormalWorker ? Colors.teal.shade900 : Colors.purple.shade900),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _storage.isNormalWorker
                              ? 'Workday schedule, 20-20-20 eye care & hydration tracker active'
                              : 'Amma voice assistant & medicine reminders active',
                          style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade300 : Colors.grey[800]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Accessibility & Theme Settings Header
            Text('Accessibility & Theme', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            // Senior Accessibility Switch (ONLY for Senior Citizen mode)
            if (_storage.isSeniorCitizen) ...[
              Card(
                elevation: 0,
                color: theme.cardColor,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200)),
                child: SwitchListTile(
                  secondary: const Icon(Icons.elderly_rounded, color: Colors.orangeAccent),
                  title: const Text('👵 Senior Accessibility Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: const Text('Scales font sizes & touch buttons for easy readability', style: TextStyle(fontSize: 11)),
                  value: _storage.isSeniorMode,
                  activeThumbColor: primaryColor,
                  onChanged: (val) {
                    setState(() {
                      _storage.isSeniorMode = val;
                    });
                    MyApp.reloadTheme(context);
                  },
                ),
              ),
            ],

            // Dark Mode Switch
            Card(
              elevation: 0,
              color: theme.cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200)),
              child: SwitchListTile(
                secondary: const Icon(Icons.dark_mode_rounded, color: Colors.purpleAccent),
                title: const Text('🌙 OLED Dark Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Reduces eye strain for nighttime usage', style: TextStyle(fontSize: 11)),
                value: _storage.isDarkMode,
                activeThumbColor: primaryColor,
                onChanged: (val) {
                  setState(() {
                    _storage.isDarkMode = val;
                  });
                  MyApp.reloadTheme(context);
                },
              ),
            ),

            // Sound Chimes Switch
            Card(
              elevation: 0,
              color: theme.cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200)),
              child: SwitchListTile(
                secondary: const Icon(Icons.volume_up_rounded, color: Colors.teal),
                title: const Text('🔊 Sound Completion Chimes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Play chime sounds when completing activities', style: TextStyle(fontSize: 11)),
                value: _storage.soundEnabled,
                activeThumbColor: primaryColor,
                onChanged: (val) {
                  setState(() {
                    _storage.soundEnabled = val;
                    SoundService.soundEnabled = val;
                  });
                },
              ),
            ),

            const SizedBox(height: 16),

            // Color Themes Picker (Responsive Horizontal Scroll)
            Text('Color Palette Accent', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _ThemeColorChip(name: 'Ocean Blue', colorName: 'blue', color: const Color(0xFF1E88E5), selected: _storage.colorTheme == 'blue', onTap: () => _updateColorTheme('blue')),
                  const SizedBox(width: 8),
                  _ThemeColorChip(name: 'Emerald', colorName: 'green', color: const Color(0xFF2E7D32), selected: _storage.colorTheme == 'green', onTap: () => _updateColorTheme('green')),
                  const SizedBox(width: 8),
                  _ThemeColorChip(name: 'Violet', colorName: 'violet', color: const Color(0xFF6A1B9A), selected: _storage.colorTheme == 'violet', onTap: () => _updateColorTheme('violet')),
                  const SizedBox(width: 8),
                  _ThemeColorChip(name: 'Rose Pink', colorName: 'pink', color: const Color(0xFFD81B60), selected: _storage.colorTheme == 'pink', onTap: () => _updateColorTheme('pink')),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Hydration Settings Card
            Text('💧 Hydration & Cup Portion Settings', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              elevation: 0,
              color: theme.cardColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: isDark ? Colors.blue.shade900 : Colors.blue.shade100),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: isDark ? Colors.blue.shade900 : Colors.blue.shade100,
                          child: const Icon(Icons.water_drop_rounded, color: Colors.blueAccent, size: 16),
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Single Glass / Sip Portion Size',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              Text(
                                'Amount automatically logged when tapping "Drank" from status bar notification',
                                style: TextStyle(fontSize: 10.5, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ChoiceChip(
                            avatar: const Icon(Icons.coffee_rounded, size: 14),
                            label: const Text('150ml (Cup) ⭐'),
                            selected: _storage.hydrationPortionMl == 150,
                            selectedColor: Colors.blueAccent.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationPortionMl = 150;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            avatar: const Icon(Icons.local_cafe_rounded, size: 14),
                            label: const Text('200ml'),
                            selected: _storage.hydrationPortionMl == 200,
                            selectedColor: Colors.blueAccent.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationPortionMl = 200;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            avatar: const Icon(Icons.opacity_rounded, size: 14),
                            label: const Text('250ml (Glass)'),
                            selected: _storage.hydrationPortionMl == 250,
                            selectedColor: Colors.blueAccent.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationPortionMl = 250;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            avatar: const Icon(Icons.sports_bar_rounded, size: 14),
                            label: const Text('300ml (Mug)'),
                            selected: _storage.hydrationPortionMl == 300,
                            selectedColor: Colors.blueAccent.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationPortionMl = 300;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.flag_rounded, color: Colors.teal, size: 16),
                        const SizedBox(width: 6),
                        const Text(
                          'Daily Target Goal:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        const Spacer(),
                        Text(
                          '${_storage.hydrationGoalMl}ml / day',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ChoiceChip(
                            label: const Text('2,000ml'),
                            selected: _storage.hydrationGoalMl == 2000,
                            selectedColor: Colors.teal.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationGoalMl = 2000;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: const Text('2,500ml (Recommended) ⭐'),
                            selected: _storage.hydrationGoalMl == 2500,
                            selectedColor: Colors.teal.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationGoalMl = 2500;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: const Text('3,000ml (Active)'),
                            selected: _storage.hydrationGoalMl == 3000,
                            selectedColor: Colors.teal.withValues(alpha: 0.2),
                            onSelected: (_) {
                              setState(() {
                                _storage.hydrationGoalMl = 3000;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Navigation Links
            if (_storage.isSeniorCitizen)
              _SettingsTile(
                icon: Icons.record_voice_over_rounded,
                title: '🗣️ Senior Voice Companion & Alerts',
                subtitle: 'Multi-lingual Amma/Maa voice persona, voice alerts & speech test',
                iconColor: Colors.purpleAccent,
                onTap: () => Navigator.pushNamed(context, AppRoutes.voiceCompanion),
              ),
            _SettingsTile(
              icon: Icons.remove_red_eye_outlined,
              title: 'Screen Care & Eye Health',
              subtitle: 'Configure 20-20-20 rule breaks and timers',
              iconColor: Colors.blueAccent,
              onTap: () => Navigator.pushNamed(context, AppRoutes.screenCareSettings),
            ),
            _SettingsTile(
              icon: Icons.people_outline_rounded,
              title: 'Family Wellness Sharing',
              subtitle: 'Connect with family members & track progress',
              iconColor: Colors.green,
              onTap: () => Navigator.pushNamed(context, AppRoutes.familySharing),
            ),

            const SizedBox(height: 24),

            if (isLoggedIn)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    _storage.jwtToken = null;
                    Navigator.pushNamedAndRemoveUntil(
                      context,
                      AppRoutes.portal,
                      (route) => false,
                    );
                  },
                  icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                  label: const Text('Log Out & Return to Portal', style: TextStyle(color: Colors.redAccent)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _updateColorTheme(String themeName) {
    setState(() {
      _storage.colorTheme = themeName;
    });
    MyApp.reloadTheme(context);
  }
}

class _ThemeColorChip extends StatelessWidget {
  final String name;
  final String colorName;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeColorChip({
    required this.name,
    required this.colorName,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      avatar: CircleAvatar(backgroundColor: color, radius: 8),
      label: Text(name),
      selected: selected,
      selectedColor: color.withValues(alpha: 0.2),
      onSelected: (_) => onTap(),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color iconColor;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = Theme.of(context).cardColor;

    return Card(
      elevation: 0,
      color: cardColor,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200)),
      child: ListTile(
        dense: true,
        leading: Icon(icon, color: iconColor, size: 24),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isDark ? Colors.white : Colors.black87)),
        subtitle: Text(subtitle, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade400 : Colors.grey[600])),
        trailing: Icon(Icons.chevron_right_rounded, color: isDark ? Colors.grey.shade400 : Colors.grey, size: 20),
        onTap: onTap,
      ),
    );
  }
}
