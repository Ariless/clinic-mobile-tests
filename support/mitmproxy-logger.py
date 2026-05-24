"""
mitmproxy addon — logs every outgoing request to MITMPROXY_LOG_FILE as JSONL.
Run with: mitmdump -s mitmproxy-logger.py --listen-port 8080 --quiet
"""
import json
import os
from mitmproxy import http

LOG_FILE = os.environ.get("MITMPROXY_LOG_FILE", "/tmp/mitmproxy-requests.jsonl")


class RequestLogger:
    def request(self, flow: http.HTTPFlow) -> None:
        try:
            body = flow.request.get_text(strict=False) or ""
        except Exception:
            body = ""

        entry = {
            "host": flow.request.host,
            "url": flow.request.pretty_url,
            "method": flow.request.method,
            "query": dict(flow.request.query),
            "body": body[:4096],  # cap at 4 KB to avoid huge log entries
        }
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")

        # 10.0.2.2 is the Android emulator alias for the host machine.
        # From the Mac side mitmdump can't reach 10.0.2.2 — rewrite to
        # localhost so the proxy can forward requests to the local SUT.
        if flow.request.host == "10.0.2.2":
            flow.request.host = "127.0.0.1"


addons = [RequestLogger()]
