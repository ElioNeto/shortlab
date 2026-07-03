"""Tests for subtitle generation."""
import os
import tempfile
from subtitles import generate_srt, hex_to_ass_color, format_srt_block

def test_format_srt_block():
    result = format_srt_block(1, 0.0, 2.5, "Hello world")
    assert "00:00:00,000 --> 00:00:02,500" in result
    assert "Hello world" in result

def test_hex_to_ass_color():
    result = hex_to_ass_color("#FF0000", 1.0)
    assert "&H000000FF" == result

def test_generate_srt_empty():
    transcript = {"segments": []}
    with tempfile.NamedTemporaryFile(suffix='.srt', delete=False, mode='w') as f:
        pass
    result = generate_srt(transcript, 0, 10, f.name)
    os.unlink(f.name)
    assert result is False
