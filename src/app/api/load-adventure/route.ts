import path from 'path';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename') || 'el-dragon-del-pico-agujahelada.json';

    log.info('API: Loading adventure data', { module: 'API', endpoint: '/api/load-adventure', filename });
    
    // Prevent directory traversal
    const safeFilename = filename.replace(/^(\.\.[\/\\])+/, '');
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const filePath = path.join(jsonDirectory, safeFilename);

    // Ensure the resolved path is within the JSON_adventures directory
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(jsonDirectory))) {
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
