import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'admin_api.dart';

class IntroAdminPage extends StatefulWidget {
  const IntroAdminPage({super.key, this.request = requestAdmin});
  final AdminRequest request;
  @override
  State<IntroAdminPage> createState() => _IntroAdminPageState();
}

class _IntroAdminPageState extends State<IntroAdminPage> {
  final title = TextEditingController(),
      body = TextEditingController(),
      notice = TextEditingController();
  String page = 'page1', audience = '', kind = 'announcement', view = 'all';
  String? error, status, imageUrl, cursor;
  Uint8List? image;
  bool removeImage = false, busy = false, loaded = false;
  int version = 0, epoch = 0;
  List<Map<String, dynamic>> users = [], notices = [];
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final generation = ++epoch;
    setState(() {
      busy = true;
      error = null;
      loaded = false;
    });
    try {
      final data = await widget.request('getIntroPages', {});
      final value = (data['pages'] as List).cast<Map>().firstWhere(
        (p) => p['page'] == page,
      );
      if (mounted && generation == epoch) {
        setState(() {
          title.text = value['title'] as String;
          body.text = value['text'] as String;
          imageUrl = value['imageUrl'] as String;
          version = value['version'] as int;
          image = null;
          removeImage = false;
          loaded = true;
        });
      }
    } catch (e) {
      if (mounted && generation == epoch) setState(() => error = adminError(e));
    } finally {
      if (mounted && generation == epoch) setState(() => busy = false);
    }
  }

  Future<void> pick() async {
    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1200,
        imageQuality: 80,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (bytes.length > 1536 * 1024) {
        if (mounted) {
          setState(
            () => error =
                'Choose a smaller picture (maximum 1.5 MB after resizing).',
          );
        }
        return;
      }
      if (mounted) {
        setState(() {
          image = bytes;
          removeImage = false;
          error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Could not open this picture. Please choose another.',
        );
      }
    }
  }

  Future<void> save() async {
    if (!loaded || title.text.trim().isEmpty) {
      setState(() => error = 'Load the page and enter a title first.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
      status = null;
    });
    try {
      await widget.request('saveIntroPage', {
        'page': page,
        'title': title.text.trim(),
        'text': body.text.trim(),
        'version': version,
        if (image != null) 'imageBase64': base64Encode(image!),
        if (removeImage) 'removeImage': true,
      });
      if (!mounted) return;
      await load();
      if (mounted) {
        setState(
          () => status = 'Intro page saved. Changes are visible to everyone.',
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> recipients() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final rows = <Map<String, dynamic>>[];
      String? token;
      do {
        final data = await widget.request('listDashboardUsers', {
          'pageToken': ?token,
        });
        rows.addAll(
          (data['users'] as List).map((u) => Map<String, dynamic>.from(u)),
        );
        token = data['pageToken'] as String?;
      } while (token != null);
      if (mounted) {
        setState(
          () => users = rows.where((u) => u['disabled'] != true).toList(),
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> publish() async {
    if (notice.text.trim().isEmpty) return;
    setState(() {
      busy = true;
      error = null;
      status = null;
    });
    try {
      await widget.request('publishIntroNotice', {
        'text': notice.text.trim(),
        'kind': kind,
        'recipientUid': audience,
      });
      if (mounted) {
        notice.clear();
        setState(
          () => status = audience.isEmpty
              ? 'Announcement published for everyone.'
              : 'Private notice sent to the selected user.',
        );
        await loadNotices();
      }
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> loadNotices({bool append = false}) async {
    final generation = ++epoch;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.request('listIntroNotices', {
        'audience': view,
        if (append && cursor != null) 'cursor': cursor,
      });
      if (mounted && generation == epoch) {
        setState(() {
          notices = [
            if (append) ...notices,
            ...(data['items'] as List).map((v) => Map<String, dynamic>.from(v)),
          ];
          cursor = data['cursor'] as String?;
        });
      }
    } catch (e) {
      if (mounted && generation == epoch) setState(() => error = adminError(e));
    } finally {
      if (mounted && generation == epoch) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    epoch++;
    title.dispose();
    body.dispose();
    notice.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Intro pages & global notices')),
    body: ListView(
      padding: const EdgeInsets.all(22),
      children: [
        const Text(
          'Super Admin only',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        DropdownButtonFormField<String>(
          isExpanded: true,
          initialValue: page,
          items: const [
            DropdownMenuItem(value: 'page1', child: Text('Intro page 1')),
            DropdownMenuItem(value: 'page2', child: Text('Intro page 2')),
            DropdownMenuItem(
              value: 'page3',
              child: Text('Intro page 3 · Notices'),
            ),
          ],
          onChanged: busy
              ? null
              : (value) {
                  setState(() {
                    page = value!;
                    error = null;
                    status = null;
                  });
                  if (page == 'page3') {
                    loadNotices();
                  } else {
                    load();
                  }
                },
        ),
        if (busy) const LinearProgressIndicator(),
        if (page != 'page3') ...[
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'These pictures and text are public and appear in the intro pages after sign-in.',
            ),
          ),
          if (image != null)
            Image.memory(image!, height: 220, fit: BoxFit.contain)
          else if (!removeImage && (imageUrl ?? '').isNotEmpty)
            Image.network(
              imageUrl!,
              height: 220,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Text('Image unavailable'),
            ),
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: busy ? null : pick,
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Upload picture'),
              ),
              TextButton(
                onPressed: busy
                    ? null
                    : () => setState(() {
                        image = null;
                        removeImage = true;
                      }),
                child: const Text('Remove picture'),
              ),
            ],
          ),
          TextField(
            controller: title,
            enabled: !busy && loaded,
            maxLength: 120,
            decoration: const InputDecoration(labelText: 'Title'),
          ),
          TextField(
            controller: body,
            enabled: !busy && loaded,
            maxLength: 3000,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Intro text'),
          ),
          FilledButton(
            onPressed: busy || !loaded ? null : save,
            child: const Text('Save intro page'),
          ),
          TextButton(
            onPressed: busy ? null : load,
            child: const Text('Reload saved page (discard draft)'),
          ),
        ] else ...[
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Everyone notices appear in Intro 3 after sign-in. Notices for a selected user are private and require sign-in. Commands are text instructions.',
            ),
          ),
          DropdownButtonFormField<String>(
            isExpanded: true,
            key: ValueKey('audience-${users.length}-$audience'),
            initialValue: audience,
            decoration: const InputDecoration(labelText: 'Audience'),
            items: [
              const DropdownMenuItem(
                value: '',
                child: Text('Everyone (public)'),
              ),
              for (final user in users)
                DropdownMenuItem(
                  value: user['uid'] as String,
                  child: Text(
                    '${user['username']} · ${user['email']}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: busy
                ? null
                : (value) => setState(() => audience = value!),
          ),
          TextButton(
            onPressed: busy ? null : recipients,
            child: const Text('Load registered recipients'),
          ),
          DropdownButtonFormField<String>(
            isExpanded: true,
            initialValue: kind,
            decoration: const InputDecoration(labelText: 'Notice type'),
            items: const [
              DropdownMenuItem(
                value: 'announcement',
                child: Text('Announcement'),
              ),
              DropdownMenuItem(
                value: 'instruction',
                child: Text('Command / instruction'),
              ),
            ],
            onChanged: busy ? null : (v) => setState(() => kind = v!),
          ),
          TextField(
            controller: notice,
            enabled: !busy,
            maxLength: 3000,
            maxLines: 5,
            decoration: const InputDecoration(labelText: 'Notice text'),
          ),
          FilledButton(
            onPressed: busy ? null : publish,
            child: const Text('Publish / send notice'),
          ),
          const Divider(),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Public notices'),
                selected: view == 'all',
                onSelected: busy
                    ? null
                    : (_) {
                        setState(() => view = 'all');
                        loadNotices();
                      },
              ),
              ChoiceChip(
                label: const Text('All sent notices'),
                selected: view == 'sent',
                onSelected: busy
                    ? null
                    : (_) {
                        setState(() => view = 'sent');
                        loadNotices();
                      },
              ),
            ],
          ),
          for (final item in notices)
            ListTile(
              title: Text(item['text'] as String),
              subtitle: Text(
                '${item['kind']} · ${philippineTime(item['createdAt'])}${item['recipientUid'] != null ? ' · ${item['recipientUid'] == '' ? 'Everyone' : item['recipientUid']}' : ''}',
              ),
            ),
          TextButton(
            onPressed: busy ? null : () => loadNotices(),
            child: const Text('Refresh notices'),
          ),
          if (cursor != null)
            TextButton(
              onPressed: busy ? null : () => loadNotices(append: true),
              child: const Text('Load older notices'),
            ),
        ],
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        if (status != null) Text(status!),
      ],
    ),
  );
}
