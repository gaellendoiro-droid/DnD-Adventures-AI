import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

interface AdventureNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: AdventureNode[];
}

// Directories to ignore
const ignoredDirs = ['dev', 'backup'];

function shouldIgnoreFile(fileName: string): boolean {
  return fileName.endsWith('.schema.json') || 
         fileName.includes('package.json') || 
         fileName.includes('tsconfig.json');
}

async function buildAdventureTree(dir: string, baseDir: string, relativePath: string = ''): Promise<AdventureNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: AdventureNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativeEntryPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Ignore specified directories
      if (!ignoredDirs.includes(entry.name)) {
        const children = await buildAdventureTree(fullPath, baseDir, relativeEntryPath);
        // Only add folder if it has children (JSON files or subfolders with JSON files)
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            path: relativeEntryPath,
            type: 'folder',
            children
          });
        }
      }
    } else if (entry.isFile() && entry.name.endsWith('.json') && !shouldIgnoreFile(entry.name)) {
      nodes.push({
        name: entry.name,
        path: relativeEntryPath,
        type: 'file'
      });
    }
  }

  // Sort: folders first, then files, both alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const tree = await buildAdventureTree(jsonDirectory, jsonDirectory);

    return NextResponse.json({ tree });
  } catch (error) {
    log.error('API: Failed to list adventures', { error });
    return NextResponse.json({ error: 'Failed to list adventures' }, { status: 500 });
  }
}

