import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    log.info('API: Loading adventure data', { module: 'API', endpoint: '/api/load-adventure' });
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const fileContents = await fs.readFile(jsonDirectory + '/el-dragon-del-pico-agujahelada.json', 'utf8');
    const data = JSON.parse(fileContents);
    log.info('API: Adventure data loaded successfully', { 
      module: 'API',
      endpoint: '/api/load-adventure',
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
