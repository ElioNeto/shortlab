"""Plugin system for custom AI models and processors."""
import os
import importlib.util
import inspect
from typing import Optional
from fastapi import APIRouter

router = APIRouter(prefix="/api/plugins", tags=["Plugins"])

PLUGINS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "plugins")
os.makedirs(PLUGINS_DIR, exist_ok=True)

# Plugin registry
_plugins = {}

class PluginBase:
    """Base class for all ShortLab plugins."""
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    
    def initialize(self):
        pass

class LLMProviderPlugin(PluginBase):
    """Plugin for custom LLM providers."""
    provider_name: str = ""
    
    async def generate(self, prompt: str, **kwargs) -> str:
        raise NotImplementedError

class VideoProcessorPlugin(PluginBase):
    """Plugin for custom video processing."""
    
    async def process(self, input_path: str, output_path: str, **kwargs) -> bool:
        raise NotImplementedError

def discover_plugins():
    """Discover and load plugins from the plugins directory."""
    for f in os.listdir(PLUGINS_DIR):
        if f.endswith(".py") and not f.startswith("_"):
            try:
                module_name = f[:-3]
                spec = importlib.util.spec_from_file_location(module_name, os.path.join(PLUGINS_DIR, f))
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    for name, obj in inspect.getmembers(module):
                        if inspect.isclass(obj) and issubclass(obj, PluginBase) and obj is not PluginBase:
                            instance = obj()
                            instance.initialize()
                            _plugins[instance.name] = instance
            except Exception as e:
                print(f"[Plugins] Failed to load {f}: {e}")

@router.get("/list")
async def list_plugins():
    return {
        "plugins": [
            {"name": p.name, "version": p.version, "description": p.description, "type": type(p).__name__}
            for p in _plugins.values()
        ]
    }

@router.post("/reload")
async def reload_plugins():
    _plugins.clear()
    discover_plugins()
    return {"status": "reloaded", "count": len(_plugins)}

# Auto-discover plugins on import
discover_plugins()
