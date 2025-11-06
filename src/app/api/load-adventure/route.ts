import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'JSON_adventures');
    const fileContents = await fs.readFile(jsonDirectory + '/el-dragon-del-pico-agujahelada.json', 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load adventure data:', error);
    return new NextResponse('Error loading adventure data.', { status: 500 });
  }
}
