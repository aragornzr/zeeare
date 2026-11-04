import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:camera/camera.dart';
import 'package:face_detection_tflite/face_detection_tflite.dart';
import 'package:flutter/material.dart';

import 'attendance_store.dart';

class AttendanceFaceCapture extends StatefulWidget {
  const AttendanceFaceCapture({super.key});
  @override
  State<AttendanceFaceCapture> createState() => _AttendanceFaceCaptureState();
}

class _AttendanceFaceCaptureState extends State<AttendanceFaceCapture>
    with WidgetsBindingObserver {
  CameraController? _camera;
  FaceDetector? _detector;
  String? _error;
  bool _ready = false, _busy = false;
  int _step = 0;
  final bool _turnPositive = Random.secure().nextBool();
  final List<List<double>> _samples = [];
  DateTime? _started;
  Future<void>? _operation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _operation = _initialize();
  }

  Future<void> _initialize() async {
    try {
      final cameras = await availableCameras();
      if (!mounted) return;
      if (cameras.isEmpty) throw StateError('No camera is available.');
      final camera =
          cameras
              .where((c) => c.lensDirection == CameraLensDirection.front)
              .firstOrNull ??
          cameras.first;
      _camera = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
      );
      await _camera!.initialize();
      if (!mounted) return;
      _detector = await FaceDetector.create(
        model: FaceDetectionModel.frontCamera,
        minScore: .9,
        minFaceSize: .20,
      );
      if (mounted) setState(() => _ready = true);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Camera or face recognition could not start. Check camera permission and try again.',
        );
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused && mounted) {
      // A scan must remain one continuous foreground interaction.
      Navigator.of(context).pop();
    }
  }

  Future<void> _capture() async {
    if (_busy || !_ready) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    String? path;
    try {
      if (_started != null &&
          DateTime.now().difference(_started!) > const Duration(seconds: 90)) {
        _step = 0;
        _samples.clear();
        _started = null;
        throw StateError(
          'The scan expired. Start again looking straight ahead.',
        );
      }
      final photo = await _camera!.takePicture();
      path = photo.path;
      final bytes = await photo.readAsBytes();
      if (!mounted) return;
      final faces = await _detector!.detectFacesFromBytes(
        bytes,
        mode: FaceDetectionMode.full,
      );
      if (!mounted) return;
      if (faces.length != 1) {
        throw StateError(
          'Only one person should be visible. Move closer in good lighting.',
        );
      }
      final face = faces.single;
      final yaw = face.headEulerAngleY;
      final pitch = face.headEulerAngleX;
      if (yaw == null || pitch == null) {
        throw StateError('Face position could not be checked. Try again.');
      }
      if (_step == 1) {
        if ((_turnPositive ? yaw : -yaw) < 15 ||
            yaw.abs() > 40 ||
            pitch.abs() > 20) {
          throw StateError('Turn slightly toward the arrow and capture again.');
        }
      } else if (yaw.abs() > 12 || pitch.abs() > 18) {
        throw StateError('Look straight at the camera and capture again.');
      }
      final embedding = (await _detector!.getFaceEmbedding(
        face,
        bytes,
      )).toList();
      if (!mounted) return;
      if (_samples.isNotEmpty &&
          faceSimilarity(_samples.first, embedding) < .65) {
        _step = 0;
        _samples.clear();
        _started = null;
        throw StateError(
          'Face changed during the scan. Start again with one person.',
        );
      }
      _started ??= DateTime.now();
      if (_step != 1) _samples.add(embedding);
      if (_step == 2) {
        Navigator.of(context).pop(List<List<double>>.from(_samples));
      } else {
        setState(() => _step++);
      }
    } on StateError catch (error) {
      if (mounted) setState(() => _error = error.message.toString());
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Face scan failed. Try again in good lighting.',
        );
      }
    } finally {
      if (path != null) {
        try {
          await File(path).delete();
        } catch (_) {}
      }
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    final operation = _operation;
    unawaited(() async {
      try {
        await operation;
      } catch (_) {}
      await _camera?.dispose();
      await _detector?.dispose();
    }());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final instruction = switch (_step) {
      1 => 'Turn slightly ${_turnPositive ? '←' : '→'} toward the arrow',
      2 => 'Look straight ahead again',
      _ => 'Look straight at the camera',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Face scan')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'Step ${_step + 1} of 3',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 12),
            Text(instruction, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            const Text(
              'Keep one face visible in good lighting. Follow the movement prompt, then tap Capture.',
            ),
            const SizedBox(height: 20),
            if (_ready)
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: AspectRatio(
                  aspectRatio: 3 / 4,
                  child: CameraPreview(_camera!),
                ),
              )
            else if (_error == null)
              const Center(child: CircularProgressIndicator()),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: !_ready || _busy
                  ? null
                  : () {
                      _operation = _capture();
                    },
              icon: _busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.camera_alt_outlined),
              label: Text(_busy ? 'Checking face…' : 'Capture'),
            ),
          ],
        ),
      ),
    );
  }
}
