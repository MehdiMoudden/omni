#!/usr/bin/env python3
"""Standalone MCP connectivity test targeting Healthy Basket tools."""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List, Tuple

import requests

DEFAULT_MCP_URL = (
    "https://my-elasticsearch-project-bcf9d2.kb.us-east-1.aws.elastic.cloud"
    "/api/agent_builder/mcp"
)
DEFAULT_API_KEY = "STQ0dTdKa0JtRWl0cWdMZnBTZnE6dFpoTFdERFRBVjBkUjZyTENpbEE1UQ=="
DEFAULT_CANDIDATE_TOOLS: List[Tuple[str, Dict[str, Any]]] = [
    ("healthy_basket_products", {"nlQuery": "show budget friendly products", "size": 5}),
    ("healthy_basket_promotions", {"nlQuery": "current promotions", "size": 5}),
]
DEFAULT_TIMEOUT = 60


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Probe the Elastic MCP endpoint and optionally call tools."
    )
    parser.add_argument(
        "--url",
        default=os.getenv("MCP_URL", DEFAULT_MCP_URL),
        help="MCP endpoint URL",
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("MCP_API_KEY", DEFAULT_API_KEY),
        help="Elastic ApiKey credential",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="HTTP timeout in seconds",
    )
    parser.add_argument(
        "--tool",
        action="append",
        default=[],
        help="Invoke an MCP tool: name, name=JSON_ARGS, or name=key:value[,key2:value2].",
    )
    parser.add_argument(
        "--skip-default-tools",
        action="store_true",
        help="Do not call the default healthy-basket tool set.",
    )
    parser.add_argument(
        "--show-tools",
        action="store_true",
        help="List available tools after initialization.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print raw JSON responses.",
    )
    return parser.parse_args()


def rpc(url: str, api_key: str, method: str, params: Dict[str, Any] | None, rid: int, timeout: int) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"jsonrpc": "2.0", "id": rid, "method": method}
    if params is not None:
        payload["params"] = params
    headers = {
        "Authorization": f"ApiKey {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "kbn-xsrf": "true",
    }
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()
    data: Dict[str, Any] = response.json()
    if "error" in data:
        raise RuntimeError(f"{method} error: {data['error']}")
    return data["result"]


def _parse_simple_kv(arg_string: str) -> Dict[str, Any]:
    pairs = [segment.strip() for segment in arg_string.split(",") if segment.strip()]
    parsed: Dict[str, Any] = {}
    for pair in pairs:
        if ":" not in pair:
            raise ValueError(f"Missing ':' in argument segment '{pair}'")
        key, raw_value = pair.split(":", 1)
        key = key.strip()
        value = raw_value.strip()
        if not key:
            raise ValueError("Empty key in tool argument segment.")
        if value.lower() in {"true", "false"}:
            parsed[key] = value.lower() == "true"
        else:
            try:
                parsed[key] = int(value)
            except ValueError:
                try:
                    parsed[key] = float(value)
                except ValueError:
                    parsed[key] = value
    return parsed


def parse_tool_specs(specs: List[str]) -> List[Tuple[str, Dict[str, Any]]]:
    parsed: List[Tuple[str, Dict[str, Any]]] = []
    for raw in specs:
        raw = raw.strip()
        if not raw:
            continue
        if "=" in raw:
            name, json_part = raw.split("=", 1)
            name = name.strip()
            json_part = json_part.strip()
            if not json_part:
                args = {}
            else:
                try:
                    args = json.loads(json_part)
                    if not isinstance(args, dict):
                        raise ValueError("tool arguments JSON must decode to an object")
                except json.JSONDecodeError:
                    try:
                        args = _parse_simple_kv(json_part)
                    except ValueError as exc:
                        raise SystemExit(f"Invalid arguments for tool '{name}': {exc}") from exc
        else:
            name = raw
            args = {}
        parsed.append((name, args))
    return parsed


def main() -> None:
    args = parse_args()

    if not args.api_key:
        raise SystemExit("API key is required via --api-key or MCP_API_KEY env var.")

    try:
        rpc(
            url=args.url,
            api_key=args.api_key,
            method="initialize",
            params={
                "clientInfo": {"name": "healthy-basket-check", "version": "1.0.0"},
                "capabilities": {},
                "protocolVersion": "2024-11-05",
            },
            rid=1,
            timeout=args.timeout,
        )
        print("Initialization succeeded.")
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Initialization failed: {exc}") from exc

    available_tools: List[Dict[str, Any]] = []
    fetch_tool_metadata = args.show_tools or args.verbose or not args.skip_default_tools
    if fetch_tool_metadata:
        try:
            tools_result = rpc(
                args.url,
                args.api_key,
                "tools/list",
                None,
                rid=2,
                timeout=args.timeout,
            )
        except Exception as exc:  # noqa: BLE001
            raise SystemExit(f"tools/list failed: {exc}") from exc

        if isinstance(tools_result, dict):
            tools = tools_result.get("tools")
            if isinstance(tools, list):
                available_tools = [tool for tool in tools if isinstance(tool, dict)]
        if args.verbose:
            print("Raw tools/list response:")
            print(json.dumps(tools_result, indent=2, ensure_ascii=False))

    if args.show_tools and available_tools:
        print(f"Discovered {len(available_tools)} tool(s):")
        for tool in available_tools:
            name = tool.get("name", "<unnamed>")
            description = tool.get("description", "")
            print(f" - {name}: {description}")
    elif args.show_tools:
        print("tools/list returned no tool metadata.")

    default_calls: List[Tuple[str, Dict[str, Any]]] = []
    if not args.skip_default_tools:
        available_names = {tool.get("name") for tool in available_tools} if available_tools else None
        seen: set[str] = set()
        for name, payload in DEFAULT_CANDIDATE_TOOLS:
            if available_names is not None and name not in available_names:
                continue
            if name in seen:
                continue
            seen.add(name)
            default_calls.append((name, payload))
        if not default_calls and available_names:
            print("No healthy-basket tools detected in tools/list; skipping default calls.")

    tool_specs = default_calls + parse_tool_specs(args.tool)

    if not tool_specs:
        print("No tool calls queued. Use --tool or ensure defaults are available.")
        print("MCP connectivity checks completed.")
        return

    for idx, (tool_name, tool_args) in enumerate(tool_specs, start=1):
        rid = 100 + idx
        print(f"Calling tool '{tool_name}' with args {tool_args or '{}'}...")
        try:
            result = rpc(
                url=args.url,
                api_key=args.api_key,
                method="tools/call",
                params={"name": tool_name, "arguments": tool_args},
                rid=rid,
                timeout=args.timeout,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"  ❌ tools/call failed: {exc}")
            continue
        if args.verbose:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            snippet = json.dumps(result, ensure_ascii=False)
            print(f"  ✅ Success. Response snippet: {snippet[:200]}{'…' if len(snippet) > 200 else ''}")

    print("MCP connectivity checks completed.")


if __name__ == "__main__":
    main()
