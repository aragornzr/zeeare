"""Serve the local dashboard while always refreshing page and code changes."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def list_directory(self, path):
        self.send_error(403, 'Directory listing is disabled')
        return None

    def send_head(self):
        resolved = Path(self.translate_path(self.path)).resolve()
        try:
            parts = resolved.relative_to(ROOT).parts
        except ValueError:
            self.send_error(403, 'Path is outside the dashboard')
            return None
        if any(part.startswith('.') for part in parts):
            self.send_error(403, 'Private files are unavailable')
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Content-Security-Policy', "frame-ancestors 'self'; object-src 'none'; base-uri 'self'")
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        route = urlsplit(self.path).path
        if route.endswith('/') or Path(route).suffix in {'.html', '.css', '.js', '.json'}:
            self.send_header('Cache-Control', 'no-store, private')
        super().end_headers()


class DashboardServer(ThreadingHTTPServer):
    # Detailed scenes fetch photographic maps concurrently.
    request_queue_size = 64
    daemon_threads = True


if __name__ == '__main__':
    server = DashboardServer(('127.0.0.1', 8080), DashboardHandler)
    print('Dashboard and atlas: http://localhost:8080/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
