import 'package:flutter/material.dart';
import '../admin_api.dart';
import 'intro_style.dart';

class IntroContentPage extends StatefulWidget {
  const IntroContentPage({
    super.key,
    required this.page,
    this.request = requestAdmin,
  });
  final String page;
  final AdminRequest request;
  @override
  State<IntroContentPage> createState() => _IntroContentPageState();
}

class _IntroContentPageState extends State<IntroContentPage> {
  Map<String, dynamic>? content;
  bool loading = true;
  bool imageReady = true;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.request('getIntroPages', {});
      final page = (data['pages'] as List).cast<Map>().firstWhere(
        (p) => p['page'] == widget.page,
      );
      if (mounted) {
        setState(() {
          content = Map<String, dynamic>.from(page);
          imageReady = (content?['imageUrl'] as String? ?? '').isEmpty;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Could not load this intro page. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _pictureFinished(String url) {
    if (imageReady) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !imageReady && content?['imageUrl'] == url) {
        setState(() => imageReady = true);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final first = widget.page == 'page1';
    final picture = content?['imageUrl'] as String? ?? '';
    final title = content?['title'] as String? ?? '';
    final description = content?['text'] as String? ?? '';
    return IntroShell(
      index: first ? 0 : 1,
      contentReady: !loading && imageReady,
      children: [
        Container(
          width: double.infinity,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .25),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withValues(alpha: .45)),
          ),
          child: AspectRatio(
            aspectRatio: 4 / 3,
            child: picture.isNotEmpty
                ? Image.network(
                    picture,
                    fit: BoxFit.contain,
                    frameBuilder: (context, child, frame, synchronouslyLoaded) {
                      if (frame != null || synchronouslyLoaded) {
                        _pictureFinished(picture);
                        return child;
                      }
                      return const Center(
                        child: CircularProgressIndicator(color: introInk),
                      );
                    },
                    errorBuilder: (_, _, _) {
                      _pictureFinished(picture);
                      return const Center(
                        child: Text(
                          'Image unavailable.',
                          style: TextStyle(color: introInk),
                        ),
                      );
                    },
                  )
                : Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: .22),
                        ),
                      ),
                      Container(
                        width: 130,
                        height: 130,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: introInk.withValues(alpha: .1),
                          ),
                        ),
                      ),
                      Icon(
                        first
                            ? Icons.location_city_rounded
                            : Icons.handshake_outlined,
                        size: 80,
                        color: introInk,
                      ),
                      Positioned(
                        bottom: 22,
                        child: Text(
                          first
                              ? 'OUR TOWN. OUR COMMUNITY.'
                              : 'CONNECTED THROUGH SERVICE.',
                          style: TextStyle(
                            color: introInk.withValues(alpha: .75),
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.6,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: 28),
        Text(
          first ? 'WELCOME HOME' : 'HERE FOR YOU',
          style: TextStyle(
            color: introInk.withValues(alpha: .7),
            fontWeight: FontWeight.w800,
            fontSize: 10,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title.isNotEmpty
              ? title
              : first
              ? 'Welcome to San Antonio.'
              : 'Your municipal services.',
          style: const TextStyle(
            color: introInk,
            fontSize: 34,
            height: 1.12,
            fontWeight: FontWeight.w800,
            letterSpacing: -1.2,
          ),
        ),
        if (description.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(
            description,
            style: TextStyle(
              color: introInk.withValues(alpha: .85),
              fontSize: 15,
              height: 1.7,
            ),
          ),
        ],
        const SizedBox(height: 16),
        if (loading)
          const LinearProgressIndicator(
            color: introInk,
            backgroundColor: Colors.white24,
          ),
        if (error != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .7),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              error!,
              style: const TextStyle(color: introInk, height: 1.5),
            ),
          ),
        TextButton.icon(
          style: TextButton.styleFrom(foregroundColor: introInk),
          onPressed: loading ? null : load,
          icon: const Icon(Icons.refresh, size: 17),
          label: const Text('Refresh page'),
        ),
      ],
    );
  }
}
