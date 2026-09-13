"""
Locates a manually-downloaded input file by extension rather than exact filename - browsers
often rename a download that collides with an existing file
(`Lista-FantaAsta-Fantacalcio (1).csv`), and a filename-based lookup would just silently miss
it. See input/README.md.
"""

import glob
import os


def find_single_file(directory, extension):
    matches = glob.glob(os.path.join(directory, f"*{extension}"))
    if not matches:
        raise SystemExit(
            f"No {extension} file found in {directory}\n"
            f"See {os.path.join(directory, 'README.md')} for what to download and from where."
        )
    if len(matches) > 1:
        raise SystemExit(
            f"Multiple {extension} files found in {directory}, expected exactly one:\n"
            + "\n".join(matches)
        )
    return matches[0]
