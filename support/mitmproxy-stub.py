"""
mitmproxy addon — injects stubbed responses for configured URL paths.

Reads stub rules from MITMPROXY_STUB_FILE (JSON array).
Each rule: {"method": "POST", "path": "/api/v1/appointments", "status": 500, "body": {...}}

Requests that match a rule receive the synthetic response; all others
are forwarded to the upstream server unchanged.
"""
import json
import os
from mitmproxy import http

STUB_FILE = os.environ.get("MITMPROXY_STUB_FILE", "")


class StubResponder:
    def __init__(self):
        self.rules = []
        if STUB_FILE:
            try:
                with open(STUB_FILE) as f:
                    self.rules = json.load(f)
            except Exception:
                pass

    def request(self, flow: http.HTTPFlow) -> None:
        for rule in self.rules:
            if (flow.request.method == rule["method"]
                    and rule["path"] in flow.request.pretty_url):
                flow.response = http.Response.make(
                    rule["status"],
                    json.dumps(rule.get("body", {})),
                    {"Content-Type": "application/json"},
                )
                return


addons = [StubResponder()]
