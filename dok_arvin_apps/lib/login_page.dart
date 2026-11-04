import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'onboarding_screen.dart';
import 'remembered_login.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'register_page.dart';
import 'app_theme.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    this.auth,
    this.loginStore = const RememberedLoginStore(),
  });

  final FirebaseAuth? auth;
  final RememberedLoginStore loginStore;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  // text editing controllers
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  bool _rememberPassword = false;
  bool _hidePassword = true;
  bool _loadingSavedLogin = true;
  bool _updatingSavedLogin = false;

  @override
  void initState() {
    super.initState();
    _loadSavedLogin();
  }

  Future<void> _loadSavedLogin() async {
    try {
      final saved = kIsWeb ? null : await widget.loginStore.read();
      if (!mounted) return;
      if (saved != null) {
        emailController.text = saved.email;
        passwordController.text = saved.password;
        _rememberPassword = true;
      }
    } catch (_) {
      // A locked or unavailable vault must not prevent manual sign-in.
    } finally {
      if (mounted) setState(() => _loadingSavedLogin = false);
    }
  }

  Future<void> _changeRememberPassword(bool value) async {
    if (_busy) return;
    setState(() {
      _rememberPassword = value;
      _updatingSavedLogin = !value;
    });
    if (value) return; // Save only after Firebase confirms a successful login.
    try {
      await widget.loginStore.clear();
    } catch (_) {
      if (mounted) {
        setState(() => _rememberPassword = true);
        _showError(
          'Could not remove the saved password. Try unchecking Remember password again.',
        );
      }
    } finally {
      if (mounted) setState(() => _updatingSavedLogin = false);
    }
  }

  bool _isSigningIn = false;
  bool _isResettingPassword = false;
  bool get _busy =>
      _isSigningIn ||
      _isResettingPassword ||
      _loadingSavedLogin ||
      _updatingSavedLogin;

  Future<void> _resetPassword() async {
    if (_busy) return;
    final email = emailController.text.trim();
    if (email.isEmpty) {
      _showError('Enter your email first to reset your password.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _isResettingPassword = true);
    try {
      await (widget.auth ?? FirebaseAuth.instance).sendPasswordResetEmail(
        email: email,
      );
      if (mounted) {
        _showError(
          'If an account uses this email, a password reset link has been sent. Check your inbox and spam folder.',
        );
      }
    } on FirebaseAuthException catch (error) {
      if (!mounted) return;
      _showError(switch (error.code) {
        'invalid-email' => 'Enter a valid email address.',
        'user-not-found' =>
          'If an account uses this email, a password reset link has been sent. Check your inbox and spam folder.',
        'network-request-failed' =>
          'Check your internet connection and try again.',
        'too-many-requests' => 'Too many attempts. Please wait and try again.',
        _ => 'Unable to request a password reset. Please try again.',
      });
    } catch (_) {
      if (mounted) {
        _showError('Unable to request a password reset. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _isResettingPassword = false);
    }
  }

  Future<void> signIn() async {
    if (_busy) return;
    if (emailController.text.trim().isEmpty ||
        passwordController.text.isEmpty) {
      _showError('Enter your email and password.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _isSigningIn = true);
    final email = emailController.text.trim();
    final password = passwordController.text;
    try {
      await (widget.auth ?? FirebaseAuth.instance).signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      if (!kIsWeb) {
        try {
          if (_rememberPassword) {
            await widget.loginStore.save(email, password);
          } else {
            await widget.loginStore.clear();
          }
        } catch (_) {
          if (mounted) {
            _showError(
              'Signed in, but the remembered login could not be updated on this device.',
            );
          }
        }
      }
      if (!mounted) return;
      passwordController.clear();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => OnboardingScreen(auth: widget.auth),
        ),
      );
    } on FirebaseAuthException catch (error) {
      if (!mounted) return;
      _showError(switch (error.code) {
        'invalid-credential' || 'wrong-password' || 'user-not-found' =>
          'Incorrect email or password. Use Forgot password? to reset your password.',
        'network-request-failed' =>
          'Check your internet connection and try again.',
        'too-many-requests' => 'Too many attempts. Please wait and try again.',
        'user-disabled' =>
          'This account is disabled. Contact your administrator.',
        'invalid-email' => 'Enter a valid email address.',
        _ => 'Unable to sign in. Please try again.',
      });
    } catch (_) {
      if (!mounted) return;
      _showError('Unable to sign in. Please try again.');
    } finally {
      if (mounted) setState(() => _isSigningIn = false);
    }
  }

  Future<void> _register() async {
    final registered = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => RegisterPage(auth: widget.auth)),
    );
    if (!mounted || registered != true) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => OnboardingScreen(auth: widget.auth),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Widget _loginField({
    required TextEditingController controller,
    required String hint,
    bool obscureText = false,
    TextInputType? keyboardType,
  }) => TextField(
    controller: controller,
    enabled: !_busy,
    obscureText: obscureText && _hidePassword,
    keyboardType: keyboardType,
    autocorrect: false,
    enableSuggestions: !obscureText,
    autofillHints: obscureText
        ? const [AutofillHints.password]
        : const [AutofillHints.username],
    textInputAction: obscureText ? TextInputAction.done : TextInputAction.next,
    onSubmitted: obscureText ? (_) => signIn() : null,
    decoration: InputDecoration(
      labelText: hint,
      prefixIcon: Icon(obscureText ? Icons.lock_outline : Icons.mail_outline),
      suffixIcon: obscureText
          ? IconButton(
              tooltip: _hidePassword ? 'Show password' : 'Hide password',
              onPressed: _busy
                  ? null
                  : () => setState(() => _hidePassword = !_hidePassword),
              icon: Icon(
                _hidePassword
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            )
          : null,
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.canvas,
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SectionHero(
                    eyebrow: 'San Antonio • Municipal services',
                    title: 'Welcome back.',
                    description:
                        'Your departments, records and daily services. Together in one workspace.',
                    icon: Icons.location_city_rounded,
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Sign in to your workspace',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.navy,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Use your registered email and password.',
                    style: TextStyle(color: AppColors.muted, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  _loginField(
                    controller: emailController,
                    hint: 'Email',
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  _loginField(
                    controller: passwordController,
                    hint: 'Password',
                    obscureText: true,
                  ),
                  if (!kIsWeb)
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: const Text('Remember password'),
                      subtitle: const Text('Use only on your personal device.'),
                      value: _rememberPassword,
                      onChanged: _busy
                          ? null
                          : (value) => _changeRememberPassword(value ?? false),
                    ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _busy ? null : _resetPassword,
                      child: Text(
                        _isResettingPassword
                            ? 'Sending reset link…'
                            : 'Forgot password?',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _busy ? null : signIn,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.teal,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(54),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isSigningIn
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Sign In',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text('Not a member? '),
                      TextButton(
                        onPressed: _busy ? null : _register,
                        child: const Text('Register now'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'New accounts need administrator approval before accessing department services.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
