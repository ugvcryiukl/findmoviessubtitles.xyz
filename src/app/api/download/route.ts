import { NextResponse } from 'next/server';
import { downloadSubsourceSubtitle } from '@/services/subsource';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const path = searchParams.get('path'); // For SubDL
  const idStr = searchParams.get('id'); // For SubSource

  if (!source) {
    return NextResponse.json({ error: 'Missing parameter "source"' }, { status: 400 });
  }

  try {
    if (source === 'subdl') {
      if (!path) {
        return NextResponse.json({ error: 'Missing parameter "path" for SubDL download' }, { status: 400 });
      }

      // Resolve URL and ensure it's safe and allowed
      const safeDownloadUrl = resolveSafeSubdlDownloadUrl(path);
      if (!safeDownloadUrl) {
        return NextResponse.json({ error: 'Forbidden download host' }, { status: 403 });
      }

      console.log("Proxying SubDL download from trusted SubDL host");
      const response = await fetch(safeDownloadUrl, {
        headers: {
          Accept: "application/zip,application/octet-stream,*/*",
        },
      });

      if (response.status === 429) {
        return NextResponse.json({ error: 'SubDL download limit or rate limit exceeded' }, { status: 429 });
      }
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to download file from SubDL: ${response.statusText}` }, { status: response.status });
      }

      const fileBuffer = await response.arrayBuffer();
      const contentDisposition = response.headers.get('content-disposition');

      let filename = getFilenameFromUrl(safeDownloadUrl) || 'subtitle.zip';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      if (!filename.endsWith('.zip')) {
        filename = `${filename}.zip`;
      }

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } 
    
    if (source === 'subsource') {
      if (!idStr) {
        return NextResponse.json({ error: 'Missing parameter "id" for SubSource download' }, { status: 400 });
      }

      const id = parseInt(idStr, 10);
      console.log(`Proxying SubSource download for subtitle ID: ${id}`);
      const response = await downloadSubsourceSubtitle(id);

      if (response.status === 429) {
        return NextResponse.json({ error: 'SubSource rate limit or download limit exceeded' }, { status: 429 });
      }
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to download file from SubSource: ${response.statusText}` }, { status: response.status });
      }

      const fileBuffer = await response.arrayBuffer();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `subsource-subtitle-${id}.zip`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
          if (!filename.endsWith('.zip')) {
            filename = `${filename}.zip`;
          }
        }
      }

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    return NextResponse.json({ error: `Unsupported download source: ${source}` }, { status: 400 });
  } catch (error) {
    console.error('Download Proxy Error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to download subtitle file';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// Helper to resolve and validate SubDL download URLs
function resolveSafeSubdlDownloadUrl(path: string): string | null {
  const allowedHosts = new Set([
    "dl.subdl.com",
    "subdl.com",
  ]);

  try {
    let url: URL;

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path);

    if (hasScheme) {
      url = new URL(path);
    } else {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      url = new URL(normalizedPath, "https://dl.subdl.com");
    }

    const hostname = url.hostname.toLowerCase();

    const isAllowedHost =
      allowedHosts.has(hostname) ||
      hostname.endsWith(".subdl.com");

    if (!isAllowedHost) {
      return null;
    }

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

// Utility to parse filename from url path
function getFilenameFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      return lastPart;
    }
    return null;
  } catch {
    return null;
  }
}
