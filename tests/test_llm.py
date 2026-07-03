"""Tests for LLM client."""
import pytest
from llm import parse_json_response

def test_parse_json_response_valid():
    result = parse_json_response('{"key": "value"}')
    assert result == {"key": "value"}

def test_parse_json_response_markdown():
    result = parse_json_response('```json\n{"key": "value"}\n```')
    assert result == {"key": "value"}

def test_parse_json_response_nested():
    result = parse_json_response('{"a": {"b": [1, 2, 3]}}')
    assert result == {"a": {"b": [1, 2, 3]}}
