import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('dashboard_server', Path(__file__).resolve().parents[1] / 'serve-dashboard.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class ServerSecurityTests(unittest.TestCase):
    def handler(self, path):
        handler = object.__new__(server.DashboardHandler)
        handler.path = path
        handler.directory = str(server.ROOT)
        handler.send_error = lambda code, message: setattr(handler, 'error', code)
        return handler

    def test_private_and_escaped_paths(self):
        for path in ['/.env', '/%2eenv', '/assets/.secret']:
            handler = self.handler(path)
            self.assertIsNone(handler.send_head())
            self.assertEqual(handler.error, 403)

    def test_symlink_escape_is_denied(self):
        handler = self.handler('/assets/link')
        handler.translate_path = lambda _: '/tmp/outside-dashboard'
        self.assertIsNone(handler.send_head())
        self.assertEqual(handler.error, 403)

    def test_directory_listing_is_denied(self):
        handler = self.handler('/assets/')
        self.assertIsNone(handler.list_directory(str(server.ROOT / 'assets')))
        self.assertEqual(handler.error, 403)

    def test_security_and_private_cache_headers(self):
        handler = self.handler('/login.html')
        headers = {}
        handler.send_header = lambda key, value: headers.update({key: value})
        with patch.object(server.SimpleHTTPRequestHandler, 'end_headers'):
            handler.end_headers()
        self.assertEqual(headers['Cache-Control'], 'no-store, private')
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertIn("frame-ancestors 'self'", headers['Content-Security-Policy'])

if __name__ == '__main__':
    unittest.main()
