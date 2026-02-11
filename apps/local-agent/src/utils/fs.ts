import fs from "node:fs";

export function ensureDirectories(paths: string[]): void {
  for (const dirPath of paths) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function toRelativeSafePath(base: string, absolutePath: string): string {
  if (!absolutePath.startsWith(base)) {
    return absolutePath;
  }
  return absolutePath.slice(base.length).replace(/^[/\\]+/, "");
}
