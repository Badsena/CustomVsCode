import sys
from PIL import Image
import os

source_image_path = sys.argv[1]
workspace_dir = sys.argv[2]

try:
    img = Image.open(source_image_path)
except Exception as e:
    print(f"Error opening image: {e}")
    sys.exit(1)

# Ensure it's RGBA
img = img.convert("RGBA")

# Helper to resize and save
def save_resized(size, dest_path):
    # Use LANCZOS for high-quality downsampling
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(dest_path)
    print(f"Saved: {dest_path}")

# Helper to save ICO (PIL handles multiple sizes in ICO automatically if passed a list, but we can just pass the largest and it scales, or we provide sizes)
def save_ico(dest_path, sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]):
    img.save(dest_path, format="ICO", sizes=sizes)
    print(f"Saved ICO: {dest_path}")

# Paths
resources_dir = os.path.join(workspace_dir, "resources")

# 1. win32 assets
save_ico(os.path.join(resources_dir, "win32", "code.ico"))
save_resized((70, 70), os.path.join(resources_dir, "win32", "code_70x70.png"))
save_resized((150, 150), os.path.join(resources_dir, "win32", "code_150x150.png"))

# 2. linux assets
save_resized((512, 512), os.path.join(resources_dir, "linux", "code.png"))

# 3. server assets
save_resized((192, 192), os.path.join(resources_dir, "server", "code-192.png"))
save_resized((512, 512), os.path.join(resources_dir, "server", "code-512.png"))
save_ico(os.path.join(resources_dir, "server", "favicon.ico"), sizes=[(128, 128), (64, 64), (32, 32), (16, 16)])

print("Successfully replaced all logo assets.")
