import path from 'path';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename') || 'public/adventures/el-dragon-del-pico-agujahelada/el-dragon-del-pico-agujahelada.json';

    log.info('API: Loading adventure data', { module: 'API', endpoint: '/api/load-adventure', filename });
    
    // Prevent directory traversal
    const safeFilename = filename.replace(/^(\.\.[\/\\])+/, '');
    
    // Map legacy filenames to new paths for backward compatibility
    let resolvedFilename = safeFilename;
    if (resolvedFilename === 'el-dragon-del-pico-agujahelada.json') {
      resolvedFilename = 'public/adventures/el-dragon-del-pico-agujahelada/el-dragon-del-pico-agujahelada.json';
    } else if (resolvedFilename === 'el-dragon-del-pico-agujahelada_short.json') {
      resolvedFilename = 'public/adventures/el-dragon-del-pico-agujahelada/el-dragon-del-pico-agujahelada_short.json';
    }

    let filePath: string;
    const baseDirectory = path.join(process.cwd(), 'public', 'adventures');

    if (resolvedFilename.startsWith('public/adventures/') || resolvedFilename.startsWith('public\\adventures\\')) {
      filePath = path.join(process.cwd(), resolvedFilename);
    } else {
      filePath = path.join(baseDirectory, resolvedFilename);
    }

    // Ensure the resolved path is within the allowed directories
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(baseDirectory))) {
        throw new Error('Invalid filename path');
    }

    const fileContents = await fs.readFile(resolvedPath, 'utf8');
    const data = JSON.parse(fileContents);
    
    log.info('API: Adventure data loaded successfully', { 
      module: 'API',
      endpoint: '/api/load-adventure',
      filename,
      locationsCount: data?.locations?.length || 0,
    });
    return NextResponse.json(data);
  } catch (error: any) {
    log.error('API: Failed to load adventure data', { 
      module: 'API',
      endpoint: '/api/load-adventure',
    }, error);
    return new NextResponse('Error loading adventure data.', { status: 500 });
  }
}
