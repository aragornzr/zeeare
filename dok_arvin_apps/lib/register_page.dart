import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'app_theme.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key, this.auth});

  final FirebaseAuth? auth;

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  bool _busy = false;
  bool _hidePassword = true;
  String? _error;
  User? _createdUser;

  Future<void> _register() async {
    if (_busy || !_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Keep a created account so a profile-save retry never creates it twice.
      if (_createdUser == null) {
        final credential = await (widget.auth ?? FirebaseAuth.instance)
            .createUserWithEmailAndPassword(
              email: _email.text.trim(),
              password: _password.text,
            );
        _createdUser = credential.user;
        if (_createdUser == null) throw StateError('Missing registered user');
      }
      await _createdUser!.updateDisplayName(_name.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on FirebaseAuthException catch (error) {
      if (!mounted) return;
      setState(
        () => _error = _createdUser != null
            ? 'Your account was created, but your name could not be saved. Tap Finish registration to retry.'
            : switch (error.code) {
                'email-already-in-use' =>
                  'An account already uses this email. Sign in or use another email.',
                'invalid-email' => 'Enter a valid email address.',
                'weak-password' =>
                  'Choose a stronger password. ${error.message ?? 'Use at least 8 characters.'}',
                'operation-not-allowed' =>
                  'Email registration is currently unavailable. Please contact support.',
                'network-request-failed' =>
                  'Check your internet connection and try again.',
                'too-many-requests' =>
                  'Too many attempts. Please wait and try again.',
                _ => 'Unable to register. Please try again.',
              },
      );
    } catch (_) {
      if (!mounted) return;
      setState(
        () => _error = _createdUser != null
            ? 'Your account was created, but your name could not be saved. Tap Finish registration to retry.'
            : 'Unable to register. Please try again.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    for (final controller in [_name, _email, _password, _confirmation]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(
          title: const Text('Register'),
          backgroundColor: AppColors.canvas,
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(25),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Form(
                  key: _formKey,
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  child: AutofillGroup(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(
                          Icons.person_add_alt_1,
                          size: 72,
                          color: AppColors.teal,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Create your account',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 24),
                        _field(
                          _name,
                          'Full name',
                          autofillHints: const [AutofillHints.name],
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                              ? 'Enter your full name.'
                              : null,
                        ),
                        _field(
                          _email,
                          'Email',
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          validator: (value) =>
                              RegExp(
                                r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                              ).hasMatch(value?.trim() ?? '')
                              ? null
                              : 'Enter a valid email address.',
                        ),
                        _field(
                          _password,
                          'Password',
                          secret: true,
                          autofillHints: const [AutofillHints.newPassword],
                          validator: (value) => (value?.length ?? 0) < 8
                              ? 'Use at least 8 characters.'
                              : null,
                        ),
                        _field(
                          _confirmation,
                          'Confirm password',
                          secret: true,
                          validator: (value) => value == null || value.isEmpty
                              ? 'Confirm your password.'
                              : value != _password.text
                              ? 'Passwords do not match.'
                              : null,
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Semantics(
                              liveRegion: true,
                              child: Text(
                                _error!,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              ),
                            ),
                          ),
                        ElevatedButton(
                          onPressed: _busy ? null : _register,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.teal,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _busy
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(
                                  _createdUser == null
                                      ? 'Create account'
                                      : 'Finish registration',
                                ),
                        ),
                        TextButton(
                          onPressed: _busy
                              ? null
                              : () => Navigator.of(context).pop(),
                          child: const Text('Already a member? Sign in'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool secret = false,
    TextInputType? keyboardType,
    Iterable<String>? autofillHints,
    required String? Function(String?) validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        enabled: !_busy && (_createdUser == null || controller == _name),
        obscureText: secret && _hidePassword,
        autocorrect: false,
        enableSuggestions: !secret,
        keyboardType: keyboardType,
        autofillHints: autofillHints,
        textInputAction: controller == _confirmation
            ? TextInputAction.done
            : TextInputAction.next,
        onFieldSubmitted: controller == _confirmation
            ? (_) => _register()
            : null,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          suffixIcon: secret
              ? IconButton(
                  tooltip: _hidePassword ? 'Show passwords' : 'Hide passwords',
                  onPressed: _busy
                      ? null
                      : () => setState(() => _hidePassword = !_hidePassword),
                  icon: Icon(
                    _hidePassword ? Icons.visibility : Icons.visibility_off,
                  ),
                )
              : null,
        ),
      ),
    );
  }
}
