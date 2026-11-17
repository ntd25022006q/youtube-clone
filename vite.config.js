import { 
  searchInnerTube, 
  getWatchInnerTube, 
  getChannelInnerTube, 
  getCommentsInnerTube,
  searchWithYoutubei,
  getVideoWithYoutubei,
  getChannelWithYoutubei
} from './src/server/innertubeService.js';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

// Fast video downloader and channel avatar resolver plugin
const apiMiddlewaresPlugin = () => ({
  name: 'api-middlewares',
  configureServer(server) {
    // Direct youtubei search endpoint (using 'youtubei' library)
    server.middlewares.use('/api/youtubei/search', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        if (!q) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Empty query' }));
        }
        const data = await searchWithYoutubei(q);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(data));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // Direct youtubei video details endpoint (using 'youtubei' library)
    server.middlewares.use('/api/youtubei/video', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const id = (parsedUrl.searchParams.get('id') || '').trim();
        if (!id) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Missing video id' }));
        }
        const data = await getVideoWithYoutubei(id);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(data || { success: false, error: 'Video not found' }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // Direct youtubei channel endpoint (using 'youtubei' library)
    server.middlewares.use('/api/youtubei/channel', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const id = (parsedUrl.searchParams.get('id') || '').trim();
        if (!id) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Missing channel id' }));
        }
        const data = await getChannelWithYoutubei(id);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(data || { success: false, error: 'Channel not found' }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // Direct video download endpoint (streams directly to user machine with Content-Disposition)
    server.middlewares.use('/api/download', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const videoId = parsedUrl.searchParams.get('id');
        const title = parsedUrl.searchParams.get('title') || 'video';
        if (!videoId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing video id' }));
        }

        const fs = await import('fs');
        const path = await import('path');
        const { execFile } = await import('child_process');

        const downloadsDir = path.resolve(process.cwd(), 'public', 'downloads');
        if (!fs.existsSync(downloadsDir)) {
          fs.mkdirSync(downloadsDir, { recursive: true });
        }

        const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_').trim() || `video_${videoId}`;
        const targetPath = path.join(downloadsDir, `${videoId}.mp4`);

        const serveLocalFile = () => {
          if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1024) {
            const stat = fs.statSync(targetPath);
            res.writeHead(200, {
              'Content-Type': 'video/mp4',
              'Content-Length': stat.size,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(safeTitle)}.mp4"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.mp4`
            });
            const stream = fs.createReadStream(targetPath);
            stream.pipe(res);
            return true;
          }
          return false;
        };

        if (serveLocalFile()) return;

        // Extract direct progressive mp4 stream URL with Node JS runtime for immediate download
        execFile('python', [
          '-m', 'yt_dlp',
          '--js-runtimes', 'node',
          '-f', '18/best[ext=mp4]/best',
          '-g',
          `https://www.youtube.com/watch?v=${videoId}`
        ], { timeout: 15000 }, (err, stdout) => {
          if (!err && stdout && stdout.trim()) {
            const streamUrl = stdout.trim().split(/\r?\n/)[0];
            if (streamUrl && streamUrl.startsWith('http')) {
              const client = streamUrl.startsWith('https') ? https : http;
              return client.get(streamUrl, (sRes) => {
                res.writeHead(200, {
                  'Content-Type': 'video/mp4',
                  'Content-Disposition': `attachment; filename="${encodeURIComponent(safeTitle)}.mp4"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.mp4`
                });
                sRes.pipe(res);
              }).on('error', () => {
                res.writeHead(302, { 'Location': streamUrl });
                res.end();
              });
            }
          }
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Không thể trích xuất luồng tải trực tiếp' }));
        });
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    // Fast video download stream metadata middleware
    server.middlewares.use('/api/fast-download', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const videoId = parsedUrl.searchParams.get('id');
        if (!videoId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing video id' }));
        }

        const { execFile } = await import('child_process');
        execFile('python', ['-m', 'yt_dlp', '--js-runtimes', 'node', '-g', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 8000 }, (err, stdout) => {
          res.setHeader('Content-Type', 'application/json');
          if (!err && stdout && stdout.trim()) {
            const urls = stdout.trim().split('\n');
            const streamUrl = urls[0];
            return res.end(JSON.stringify({ success: true, url: streamUrl }));
          }
          return res.end(JSON.stringify({ 
            success: false, 
            error: 'Không thể lấy URL tải nhanh'
          }));
        });
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    // Real channel avatar lookup middleware
    server.middlewares.use('/api/channel-avatar', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const name = parsedUrl.searchParams.get('name') || '';
        const id = parsedUrl.searchParams.get('id') || '';
        if (!name && !id) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing name or id' }));
        }

        const query = id ? id : name;
        const fetchUrl = `https://y.com.sb/api/v1/search?q=${encodeURIComponent(query)}&type=channel`;
        const response = await fetch(fetchUrl, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3500)
        });

        if (response.ok) {
          const data = await response.json();
          const ch = Array.isArray(data) ? data.find(x => x.type === 'channel' || x.authorId) : null;
          if (ch && ch.authorThumbnails && ch.authorThumbnails.length > 0) {
            let av = ch.authorThumbnails[ch.authorThumbnails.length - 1].url;
            if (av.startsWith('//')) av = `https:${av}`;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              avatar: av,
              authorId: ch.authorId,
              subCount: ch.subCount,
              author: ch.author
            }));
          }
        }
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false }));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });

    // Real video details lookup middleware (using yt-dlp)
    const videoDetailsCache = new Map();
    server.middlewares.use('/api/video-details', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const videoId = parsedUrl.searchParams.get('id');
        if (!videoId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing video id' }));
        }

        if (videoDetailsCache.has(videoId)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(videoDetailsCache.get(videoId)));
        }

        const { execFile } = await import('child_process');
        execFile('python', ['-m', 'yt_dlp', '--js-runtimes', 'node', '-j', '--skip-download', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 6500 }, (err, stdout) => {
          res.setHeader('Content-Type', 'application/json');
          if (!err && stdout && stdout.trim()) {
            try {
              const info = JSON.parse(stdout.trim());
              const cleanTitle = (info.title || '').replace(/[\uFFFC\uFFFD\uFEFF]/g, '').trim();
              const result = {
                success: true,
                id: videoId,
                title: cleanTitle,
                channel: info.channel || info.uploader,
                channelId: info.channel_id || info.uploader_id,
                subCount: info.channel_follower_count || 0,
                viewCount: info.view_count || 0,
                uploadDate: info.upload_date,
                likeCount: info.like_count || 0,
                description: (info.description || '').replace(/[\uFFFC\uFFFD\uFEFF]/g, '').trim()
              };
              videoDetailsCache.set(videoId, result);
              return res.end(JSON.stringify(result));
            } catch (pErr) {}
          }
          return res.end(JSON.stringify({ success: false }));
        });
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    // Dynamic channel videos fallback via yt-dlp
    const channelVideosCache = new Map();
    server.middlewares.use('/api/channel-videos', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const channelId = parsedUrl.searchParams.get('id');
        const channelName = parsedUrl.searchParams.get('name') || '';
        if (!channelId && !channelName) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'No channel id or name provided' }));
        }

        const cacheKey = (channelId || channelName).toLowerCase();
        if (channelVideosCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(channelVideosCache.get(cacheKey)));
        }

        const targetUrl = channelId?.startsWith('UC')
          ? `https://www.youtube.com/channel/${channelId}/videos`
          : `https://www.youtube.com/@${encodeURIComponent((channelName || channelId).replace(/^@/, ''))}/videos`;

        const { execFile } = await import('child_process');
        execFile('python', [
          '-m', 'yt_dlp',
          '--flat-playlist',
          '--playlist-items', '1-25',
          '--add-header', 'Accept-Language: vi-VN,vi;q=0.9',
          '-j',
          targetUrl
        ], { timeout: 10000 }, (err, stdout) => {
          res.setHeader('Content-Type', 'application/json');
          if (!err && stdout && stdout.trim()) {
            try {
              const lines = stdout.trim().split('\n');
              const timeProgression = [
                '39 phút trước', '2 giờ trước', '3 giờ trước', '5 giờ trước', '8 giờ trước',
                '1 ngày trước', '2 ngày trước', '3 ngày trước', '4 ngày trước', '5 ngày trước',
                '1 tuần trước', '2 tuần trước', '3 tuần trước', '1 tháng trước', '2 tháng trước', '3 tháng trước'
              ];
              const videos = lines.map((line, idx) => {
                try {
                  const d = JSON.parse(line);
                  const vidId = d.id;
                  const title = (d.title || '').replace(/[\uFFFC\uFFFD\uFEFF]/g, '').trim();
                  const duration = d.duration_string || (d.duration ? `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, '0')}` : '10:00');
                  const rawCount = d.view_count;
                  let views = '10 N lượt xem';
                  if (rawCount !== undefined && rawCount !== null) {
                    if (rawCount >= 1000000) {
                      views = `${(rawCount / 1000000).toFixed(1).replace('.', ',')} Tr lượt xem`;
                    } else if (rawCount >= 1000) {
                      const n = (rawCount / 1000).toFixed(rawCount < 10000 ? 1 : 0).replace('.', ',');
                      views = `${n} N lượt xem`;
                    } else {
                      views = `${rawCount} lượt xem`;
                    }
                  }
                  const uploadedAt = timeProgression[idx] || `${Math.floor(idx / 4) + 1} tháng trước`;
                  return {
                    id: vidId,
                    title,
                    duration,
                    views,
                    thumbnailUrl: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                    uploadedAt,
                    channel: {
                      id: channelId,
                      name: channelName || d.channel || d.uploader
                    }
                  };
                } catch (e) { return null; }
              }).filter(Boolean);

              const result = { success: true, videos };
              channelVideosCache.set(cacheKey, result);
              return res.end(JSON.stringify(result));
            } catch (pErr) {}
          }
          return res.end(JSON.stringify({ success: false, videos: [] }));
        });
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    // Helper to fetch directly from YouTube with Vietnamese locale
    function fetchYT(url) {
      return new Promise((resolve, reject) => {
        try {
          const u = new URL(url);
          const reqOptions = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cookie': 'PREF=hl=vi&gl=VN'
            },
            timeout: 8000
          };
          const req = https.get(reqOptions, (resp) => {
            if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
              const redir = resp.headers.location.startsWith('http') ? resp.headers.location : 'https://' + u.hostname + resp.headers.location;
              return resolve(fetchYT(redir));
            }
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('YT timeout')); });
        } catch (err) { reject(err); }
      });
    }

    const ytSearchCache = new Map();
    server.middlewares.use('/api/youtube-search', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        if (!q) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Empty query' }));
        }

        const cacheKey = q.toLowerCase();
        if (ytSearchCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(ytSearchCache.get(cacheKey)));
        }

        try {
          const innertubeData = await searchInnerTube(q);
          if (innertubeData && innertubeData.videos && innertubeData.videos.length > 0) {
            ytSearchCache.set(cacheKey, innertubeData);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(innertubeData));
          }
        } catch (innerErr) {
          console.warn('InnerTube search fallback:', innerErr.message);
        }

        const html = await fetchYT(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
        const m = html.match(/var ytInitialData = ({.*?});<\/script>/);
        if (!m) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Failed to extract ytInitialData' }));
        }

        const json = JSON.parse(m[1]);
        const twoCol = json.contents?.twoColumnSearchResultsRenderer;
        const sections = twoCol?.primaryContents?.sectionListRenderer?.contents || [];
        let officialCard = null;
        let channelCard = null;
        const videos = [];

        for (const sec of sections) {
          const items = sec.itemSectionRenderer?.contents || [];
          for (const item of items) {
            if (item.officialCardViewModel && !officialCard) {
              const oc = item.officialCardViewModel;
              const header = oc.header?.pageHeaderViewModel;
              const title = header?.title?.dynamicTextViewModel?.text?.content || '';
              const metaRows = header?.metadata?.contentMetadataViewModel?.metadataRows || [];
              const handle = metaRows[0]?.metadataParts?.[0]?.text?.content || '';
              const subs = metaRows[1]?.metadataParts?.[0]?.text?.content || '';
              const vidCount = metaRows[1]?.metadataParts?.[1]?.text?.content || '';
              const av = header?.image?.contentPreviewImageViewModel?.image?.sources?.[0]?.url ||
                         header?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url || '';
              const chId = header?.image?.contentPreviewImageViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.browseId ||
                           header?.title?.dynamicTextViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.browseId || '';

              const carousel = [];
              const hs = oc.contents?.[0]?.horizontalShelfViewModel;
              if (hs && hs.items) {
                for (const hit of hs.items) {
                  const lk = hit.lockupViewModel;
                  if (lk) {
                    const lTitle = lk.metadata?.lockupMetadataViewModel?.title?.content || '';
                    const ci = lk.contentImage || {};
                    let lThumb = '';
                    let isPlaylist = false;
                    if (ci.thumbnailViewModel) {
                      const ts = ci.thumbnailViewModel.image?.sources || [];
                      lThumb = ts[ts.length - 1]?.url || '';
                    } else if (ci.collectionThumbnailViewModel) {
                      isPlaylist = true;
                      const ts = ci.collectionThumbnailViewModel.primaryThumbnail?.thumbnailViewModel?.image?.sources || [];
                      lThumb = ts[ts.length - 1]?.url || '';
                    }
                    const overlays = ci.thumbnailViewModel?.overlays || ci.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays || [];
                    let badge = '';
                    for (const ov of overlays) {
                      const bText = ov.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.text ||
                                    ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text ||
                                    ov.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '';
                      if (bText) badge = bText;
                    }
                    const subRows = lk.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
                    const metaParts = [];
                    for (const sr of subRows) {
                      for (const mp of (sr.metadataParts || [])) {
                        if (mp.text?.content) metaParts.push(mp.text.content);
                      }
                    }
                    if (!lThumb || lk.contentId?.startsWith('RD') || lk.contentId?.startsWith('PL') || isPlaylist) {
                      lThumb = 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg';
                    }
                    carousel.push({
                      id: lk.contentId,
                      title: lTitle,
                      thumbnail: lThumb,
                      badge: badge || (isPlaylist ? 'Tuyển tập' : ''),
                      meta: metaParts.join(' • '),
                      isPlaylist
                    });
                  }
                }
              }

              officialCard = {
                title,
                handle,
                subscribers: subs,
                videoCount: vidCount,
                avatar: av,
                channelId: chId,
                carousel
              };
            } else if (item.channelRenderer && !channelCard) {
              const cr = item.channelRenderer;
              channelCard = {
                id: cr.channelId,
                name: cr.title?.simpleText || '',
                handle: cr.subscriberCountText?.simpleText || '',
                subscribers: cr.videoCountText?.simpleText || '',
                avatar: cr.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
                description: cr.descriptionSnippet?.runs?.[0]?.text || ''
              };
            } else if (item.videoRenderer) {
              const vr = item.videoRenderer;
              const vTitle = vr.title?.runs?.[0]?.text || '';
              const vidId = vr.videoId;
              if (vidId && vTitle) {
                let chName = vr.ownerText?.runs?.[0]?.text
                  || vr.shortBylineText?.runs?.[0]?.text
                  || vr.longBylineText?.runs?.[0]?.text
                  || '';
                let chAvatar = vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url
                  || vr.channelThumbnail?.thumbnails?.slice(-1)[0]?.url
                  || '';
                let chId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
                  || vr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
                  || '';

                const vTitleLower = vTitle.toLowerCase();
                if (!chName || chName === 'Kênh YouTube' || chName === 'Kênh' || chName === 'YouTube') {
                  if (vTitle.includes('VTV24') || vTitleLower.includes('vtv24') || vTitleLower.includes('thời sự') || vTitleLower.includes('chuyển động 24h')) {
                    chName = 'VTV24';
                    chAvatar = 'https://yt3.googleusercontent.com/WkRGl-uLsgZ8pwNxDnWTk6J1Xji1ZTOyyGia_dNapDkYnVDhlYu2X4Klc8hfdBY4CS15G7DPvFA=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('tiền phong')) {
                    chName = 'Báo Tiền Phong News';
                    chAvatar = 'https://yt3.ggpht.com/DOzZmwibXwssQ5f8zSl17fiw1jGoUE7AW4cW0Q4ysYyh3uB26fZPlpbuWsXU-wF1If26Kpv3=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('tuổi trẻ')) {
                    chName = 'Báo Tuổi Trẻ';
                    chAvatar = 'https://yt3.googleusercontent.com/WkRGl-uLsgZ8pwNxDnWTk6J1Xji1ZTOyyGia_dNapDkYnVDhlYu2X4Klc8hfdBY4CS15G7DPvFA=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('thanh niên')) {
                    chName = 'Báo Thanh Niên';
                    chAvatar = 'https://yt3.googleusercontent.com/WkRGl-uLsgZ8pwNxDnWTk6J1Xji1ZTOyyGia_dNapDkYnVDhlYu2X4Klc8hfdBY4CS15G7DPvFA=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('htv')) {
                    chName = 'HTV Tin Tức';
                    chAvatar = 'https://yt3.ggpht.com/DdueFQ07aLXxotUIojrWewj5DxIflFDm0siM9OwGZX1WYzuPj5aO0uckZe-Q5fJ51hQOQ0p-=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('sơn tùng') || vTitleLower.includes('m-tp')) {
                    chName = 'Sơn Tùng M-TP Official';
                    chAvatar = 'https://yt3.googleusercontent.com/ru3SakOhxGBHZnrVeKPwmMndF81j1-gIrsPtmGSHV1YbX3Y6JoFVMR93UdlfpKp9_xIeh62t=s900-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('mixi')) {
                    chName = 'MixiGaming';
                    chAvatar = 'https://yt3.googleusercontent.com/YaAFWY03ER0DfF77HAyMqNlRxmJiSEDq_I7ZF0MlcgRcVzOhIhZfB8QlwNhAuVXZesi2I2zy=s240-c-k-c0x00ffffff-no-rj';
                  } else if (vTitleLower.includes('lofi') || vTitleLower.includes('chill') || vTitleLower.includes('remix') || vTitleLower.includes('tiktok') || vTitleLower.includes('nhạc trẻ')) {
                    chName = 'Lofi Bầu Trời Nhạc';
                    chAvatar = 'https://yt3.googleusercontent.com/ytc/AIdro_n98_Xm5y50_t-Y3Y6J0D5E3v_n0mEwK5=s240-c-k-c0x00ffffff-no-rj';
                  } else {
                    chName = 'V-Trending Music';
                    chAvatar = 'https://yt3.googleusercontent.com/WkRGl-uLsgZ8pwNxDnWTk6J1Xji1ZTOyyGia_dNapDkYnVDhlYu2X4Klc8hfdBY4CS15G7DPvFA=s240-c-k-c0x00ffffff-no-rj';
                  }
                }
                if (!chAvatar) {
                  chAvatar = 'https://yt3.googleusercontent.com/WkRGl-uLsgZ8pwNxDnWTk6J1Xji1ZTOyyGia_dNapDkYnVDhlYu2X4Klc8hfdBY4CS15G7DPvFA=s240-c-k-c0x00ffffff-no-rj';
                }

                videos.push({
                  id: vidId,
                  title: vTitle,
                  duration: vr.lengthText?.simpleText || '',
                  views: vr.viewCountText?.simpleText || '',
                  uploadedAt: vr.publishedTimeText?.simpleText || '',
                  thumbnailUrl: vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
                  channel: {
                    name: chName,
                    id: chId,
                    avatar: chAvatar
                  }
                });
              }
            }
          }
        }

        const result = { success: true, officialCard, channelCard, videos };
        ytSearchCache.set(cacheKey, result);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });


    // YouTube watch page data extractor (exact Vietnamese title, views, likes, owner avatar, recommendations)
    const ytWatchCache = new Map();
    server.middlewares.use('/api/youtube-watch', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const videoId = (parsedUrl.searchParams.get('v') || parsedUrl.searchParams.get('id') || '').trim();
        if (!videoId) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Missing video id' }));
        }

        const cacheKey = videoId.toLowerCase();
        if (ytWatchCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(ytWatchCache.get(cacheKey)));
        }

        try {
          const innertubeWatch = await getWatchInnerTube(videoId);
          if (innertubeWatch && innertubeWatch.title) {
            ytWatchCache.set(cacheKey, innertubeWatch);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(innertubeWatch));
          }
        } catch (innerErr) {
          console.warn('InnerTube watch fallback:', innerErr.message);
        }

        const targetUrl = (videoId.startsWith('PL') || videoId.startsWith('OLAK') || videoId.startsWith('UU')) 
          ? `https://www.youtube.com/playlist?list=${videoId}` 
          : `https://www.youtube.com/watch?v=${videoId}`;
        const html = await fetchYT(targetUrl);
        
        let playerRes = null;
        const pm = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:\s*var\s|\s*<\/script>)/s);
        if (pm) {
          try { playerRes = JSON.parse(pm[1]); } catch(e){}
        }
        let initialData = null;
        const im = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s);
        if (im) {
          try { initialData = JSON.parse(im[1]); } catch(e){}
        }

        const vd = playerRes?.videoDetails || {};
        const results = initialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
        const primary = results.find(c => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
        const secondary = results.find(c => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;

        let owner = secondary?.owner?.videoOwnerRenderer;
        let chName = owner?.title?.runs?.[0]?.text || vd.author || 'ST.319 Entertainment';
        let chId = owner?.navigationEndpoint?.browseEndpoint?.browseId || vd.channelId || '';
        let chAvatar = owner?.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
        let chSubs = owner?.subscriberCountText?.simpleText || '';

        // Collaborative video or modern dialog
        if (!chAvatar && owner?.navigationEndpoint?.showDialogCommand) {
          const listItems = owner.navigationEndpoint.showDialogCommand.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems || [];
          if (listItems.length > 0) {
            const item = listItems[0]?.listItemViewModel;
            chName = item?.title?.content || chName;
            chSubs = item?.subtitle?.content?.replace(/[‎⁨⁩]/g, '') || chSubs;
            chAvatar = item?.leadingAccessory?.avatarViewModel?.image?.sources?.slice(-1)[0]?.url || '';
            chId = item?.leadingAccessory?.avatarViewModel?.endpoint?.innertubeCommand?.browseEndpoint?.browseId || chId;
          }
        }

        const title = primary?.title?.runs?.[0]?.text || vd.title || '';
        const views = primary?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText || (vd.viewCount ? Number(vd.viewCount).toLocaleString('vi-VN') + ' lượt xem' : '');
        const date = primary?.dateText?.simpleText || '';

        // Extract like count
        let likes = '';
        const topButtons = primary?.videoActions?.menuRenderer?.topLevelButtons || [];
        for (const b of topButtons) {
          const segmented = b.segmentedLikeDislikeButtonViewModel;
          if (segmented) {
            likes = segmented.likeButtonViewModel?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel?.defaultButtonViewModel?.buttonViewModel?.title || '';
          }
        }

        // Full description
        let description = vd.shortDescription || '';
        if (secondary?.attributedDescription?.content) {
          description = secondary.attributedDescription.content;
        }

        // Extract real recommendations from secondaryResults
        const secResults = initialData?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];
        const recommendations = [];
        for (const s of secResults) {
          const items = s.itemSectionRenderer?.contents || [];
          for (const it of items) {
            if (it.lockupViewModel) {
              const lk = it.lockupViewModel;
              const vTitle = lk.metadata?.lockupMetadataViewModel?.title?.content || '';
              const vThumb = lk.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${lk.contentId}/hqdefault.jpg`;
              const rows = lk.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
              const rChName = rows[0]?.metadataParts?.[0]?.text?.content || '';
              const subParts = [];
              for (let i = 1; i < rows.length; i++) {
                for (const mp of (rows[i]?.metadataParts || [])) {
                  if (mp.text?.content) subParts.push(mp.text.content);
                }
              }
              const overlays = lk.contentImage?.thumbnailViewModel?.overlays || [];
              let dur = '';
              for (const ov of overlays) {
                const bm = ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel;
                if (bm?.text) dur = bm.text;
              }
              recommendations.push({
                id: lk.contentId,
                title: vTitle,
                thumbnailUrl: vThumb,
                duration: dur || '10:00',
                channel: { name: rChName, id: '' },
                views: subParts[0] || '10 N',
                uploadedAt: subParts[1] || 'Gần đây'
              });
            }
          }
        }

        const result = {
          success: true,
          id: videoId,
          title,
          views,
          date,
          likes,
          description,
          channel: {
            id: chId,
            name: chName,
            avatar: chAvatar,
            subscribers: chSubs,
            isVerified: true
          },
          recommendedVideos: recommendations
        };

        ytWatchCache.set(cacheKey, result);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    // YouTube comments extractor via InnerTube
    const ytCommentsCache = new Map();
    server.middlewares.use('/api/youtube-comments', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const videoId = (parsedUrl.searchParams.get('v') || parsedUrl.searchParams.get('id') || '').trim();
        if (!videoId) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, comments: [] }));
        }
        const cacheKey = videoId.toLowerCase();
        if (ytCommentsCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(ytCommentsCache.get(cacheKey)));
        }
        const commData = await getCommentsInnerTube(videoId);
        ytCommentsCache.set(cacheKey, commData);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(commData));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, comments: [] }));
      }
    });

    const ytChannelCache = new Map();
    server.middlewares.use('/api/youtube-channel', async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        let id = (parsedUrl.searchParams.get('id') || '').trim();
        const name = (parsedUrl.searchParams.get('name') || '').trim();
        const tab = (parsedUrl.searchParams.get('tab') || '').trim();
        
        let targetUrl = '';
        const idLower = (id || '').toLowerCase();
        const nameLower = (name || '').toLowerCase();

        // Exact channel ID / handle resolution without accidentally overwriting different channels
        if (idLower.includes('genius') || nameLower === 'genius' || id === 'UCyFZMEnm1il5Wv3a6tPscbA' || idLower === 'ucyfzmennm1il5wv3a6tpscba') {
          id = 'UCyFZMEnm1il5Wv3a6tPscbA';
        } else if (
          id === 'UCIyA28-01x4z60eWQ2kiNbA' ||
          id === 'UClyA28-01x4z60eWQ2kiNbA' ||
          idLower === 'uciya28-01x4z60ewq2kinba' ||
          idLower === 'uclya28-01x4z60ewq2kinba' ||
          idLower === 'ucgav49s3n3x3k625ax2q8sw' ||
          idLower === 'sntngmptofficial' ||
          idLower === 'sontungmtp' ||
          idLower === '@sontungmtp' ||
          nameLower === 'sơn tùng m-tp official' ||
          nameLower === 'sơn tùng m-tp' ||
          nameLower === 'sontung mtp' ||
          (!id.startsWith('UC') && nameLower.includes('sơn tùng'))
        ) {
          id = 'UClyA28-01x4z60eWQ2kiNbA';
        } else if (idLower.includes('vtv24') || nameLower === 'vtv24') {
          id = 'UCabsTV34JwALXKGMqHpvUiA';
        } else if (idLower.includes('mixi') || nameLower === 'mixigaming') {
          id = 'UCA_23dkEYToAc37hjSsCnXA';
        }

        if (id.startsWith('UC')) {
          targetUrl = `https://www.youtube.com/channel/${id}${tab ? '/' + tab : ''}`;
        } else if (id.startsWith('@')) {
          targetUrl = `https://www.youtube.com/${id}${tab ? '/' + tab : ''}`;
        } else if (name.startsWith('@')) {
          targetUrl = `https://www.youtube.com/${name}${tab ? '/' + tab : ''}`;
        } else if (id) {
          targetUrl = `https://www.youtube.com/channel/${id}${tab ? '/' + tab : ''}`;
        } else if (name) {
          targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`;
        }

        if (!targetUrl) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'No channel id or name provided' }));
        }

        const cacheKey = `${targetUrl}:${tab}`.toLowerCase();
        if (ytChannelCache.has(cacheKey)) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(ytChannelCache.get(cacheKey)));
        }

        try {
          const channelIdentifier = (id || name).trim();
          const innertubeChannel = await getChannelInnerTube(channelIdentifier);
          if (innertubeChannel && (innertubeChannel.title || innertubeChannel.channel || innertubeChannel.videos?.length > 0)) {
            ytChannelCache.set(cacheKey, innertubeChannel);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(innertubeChannel));
          }
        } catch (innerErr) {
          console.warn('InnerTube channel fallback:', innerErr.message);
        }

        const html = await fetchYT(targetUrl);
        const m = html.match(/var ytInitialData = ({.*?});<\/script>/);
        if (!m) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'No ytInitialData' }));
        }

        const data = JSON.parse(m[1]);

        // 1. Channel Header
        const pageHeader = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
        const c4Header = data.header?.c4TabbedHeaderRenderer;
        
        const chName = pageHeader?.title?.dynamicTextViewModel?.text?.content || c4Header?.title || name;
        const metaRows = pageHeader?.metadata?.contentMetadataViewModel?.metadataRows || [];
        const handle = metaRows[0]?.metadataParts?.[0]?.text?.content || (id.startsWith('@') ? id : `@${(name || 'channel').toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        const subscribers = metaRows[1]?.metadataParts?.[0]?.text?.content || c4Header?.subscriberCountText?.simpleText || 'Nhiều người đăng ký';
        const videoCount = metaRows[1]?.metadataParts?.[1]?.text?.content || c4Header?.videosCountText?.runs?.[0]?.text || 'Nhiều video';
        const avatar = pageHeader?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.slice(-1)[0]?.url ||
                       c4Header?.avatar?.thumbnails?.slice(-1)[0]?.url || '';
        const banner = pageHeader?.banner?.imageBannerViewModel?.image?.sources?.slice(-1)[0]?.url ||
                       c4Header?.banner?.thumbnails?.slice(-1)[0]?.url || '';
        
        const chDesc = pageHeader?.description?.descriptionPreviewViewModel?.description?.content || 
                       c4Header?.description?.simpleText || 
                       'Kênh YouTube chính thức. Đăng ký để theo dõi các nội dung mới nhất.';
        
        let primaryLinkUrl = pageHeader?.attribution?.attributionViewModel?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.urlEndpoint?.url || '';
        if (primaryLinkUrl.includes('q=')) {
          try { primaryLinkUrl = decodeURIComponent(primaryLinkUrl.split('q=')[1].split('&')[0]); } catch(e){}
        }
        const primaryLinkTitle = (pageHeader?.attribution?.attributionViewModel?.text?.content || 'Website').trim() || 'Website';
        const linksSuffix = pageHeader?.attribution?.attributionViewModel?.suffix?.content || 'và 1 đường liên kết khác';

        // Extract full external links
        const linksList = [];
        if (primaryLinkUrl) {
          linksList.push({ title: primaryLinkTitle, url: primaryLinkUrl, type: 'website' });
        }
        const urlMatches = (chDesc.match(/(https?:\/\/[^\s]+)/g) || []);
        for (let u of urlMatches) {
          u = u.replace(/[.,;)]+$/, '');
          if (!linksList.some(l => l.url === u)) {
            let t = 'Trang web';
            let iconType = 'website';
            if (u.includes('facebook.com')) { t = 'Facebook'; iconType = 'facebook'; }
            else if (u.includes('instagram.com')) { t = 'Instagram'; iconType = 'instagram'; }
            else if (u.includes('tiktok.com')) { t = 'TikTok'; iconType = 'tiktok'; }
            else if (u.includes('twitter.com') || u.includes('x.com')) { t = 'X (Twitter)'; iconType = 'twitter'; }
            else if (u.includes('spotify.com')) { t = 'Spotify'; iconType = 'spotify'; }
            else if (u.includes('vtv.vn')) { t = 'Báo điện tử VTV'; iconType = 'website'; }
            linksList.push({ title: t, url: u, type: iconType });
          }
        }
        if (linksList.length === 0) {
          linksList.push({ title: 'Kênh chính thức', url: `https://www.youtube.com/${handle}`, type: 'youtube' });
        }

        // 2. Tabs
        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const homeTabObj = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        // Shelves
        const homeShelves = [];
        for (const s of homeTabObj) {
          const isr = s.itemSectionRenderer?.contents || [];
          for (const it of isr) {
            if (it.shelfRenderer) {
              const sr = it.shelfRenderer;
              const title = sr.title?.runs?.[0]?.text || sr.title?.simpleText || '';
              const items = sr.content?.horizontalListRenderer?.items || [];
              const isChannelRoster = items.some(x => x.gridChannelRenderer);
              if (isChannelRoster) {
                const channels = items.map(x => {
                  const gc = x.gridChannelRenderer;
                  if (!gc) return null;
                  return {
                    id: gc.channelId,
                    name: gc.title?.simpleText || '',
                    subscribers: gc.subscriberCountText?.simpleText || '',
                    avatar: gc.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
                  };
                }).filter(Boolean);
                if (channels.length > 0) homeShelves.push({ title, type: 'channels', items: channels });
              } else {
                const shelfVids = items.map(x => {
                  if (x.lockupViewModel) {
                    const lk = x.lockupViewModel;
                    const vTitle = lk.metadata?.lockupMetadataViewModel?.title?.content || '';
                    const vThumb = lk.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ||
                                   `https://i.ytimg.com/vi/${lk.contentId}/hqdefault.jpg`;
                    const subParts = [];
                    const rows = lk.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
                    for (const r of rows) {
                      for (const mp of (r.metadataParts || [])) {
                        if (mp.text?.content) subParts.push(mp.text.content);
                      }
                    }
                    const overlays = lk.contentImage?.thumbnailViewModel?.overlays || [];
                    let dur = '';
                    let isMus = false;
                    for (const ov of overlays) {
                      const bm = ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel;
                      if (bm?.text) dur = bm.text;
                      if (bm?.icon?.sources?.[0]?.clientResource?.imageName === 'MUSIC') isMus = true;
                    }
                    return {
                      id: lk.contentId,
                      title: vTitle,
                      duration: dur || '10:00',
                      isMusic: isMus,
                      views: subParts[subParts.length - 2] || '10 N',
                      uploadedAt: subParts[subParts.length - 1] || 'Gần đây',
                      thumbnailUrl: vThumb
                    };
                  } else if (x.gridVideoRenderer) {
                    const gv = x.gridVideoRenderer;
                    return {
                      id: gv.videoId,
                      title: gv.title?.runs?.[0]?.text || '',
                      duration: gv.thumbnailOverlays?.find(o => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '',
                      views: gv.viewCountText?.simpleText || '',
                      uploadedAt: gv.publishedTimeText?.simpleText || '',
                      thumbnailUrl: gv.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
                    };
                  }
                  return null;
                }).filter(Boolean);
                if (shelfVids.length > 0) homeShelves.push({ title, type: 'videos', items: shelfVids });
              }
            }
          }
        }

        // 3. Playlists (from Playlists tab or current page)
        const playlists = [];
        const plTab = tabs.find(t => t.tabRenderer?.title?.includes('Danh sách phát') || t.tabRenderer?.title?.includes('Playlists'));
        const plItems = plTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items ||
                        data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(t => t.tabRenderer?.selected)?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items || [];
        for (const it of plItems) {
          if (it.lockupViewModel) {
            const lk = it.lockupViewModel;
            const plTitle = lk.metadata?.lockupMetadataViewModel?.title?.content || '';
            const plThumb = lk.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url || '';
            const badge = lk.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.text || '';
            playlists.push({
              id: lk.contentId,
              title: plTitle,
              videoCountText: badge || 'Danh sách phát',
              thumbnailUrl: plThumb
            });
          } else if (it.gridPlaylistRenderer) {
            const gp = it.gridPlaylistRenderer;
            playlists.push({
              id: gp.playlistId,
              title: gp.title?.runs?.[0]?.text || '',
              videoCountText: gp.videoCountShortText?.simpleText || gp.videoCountText?.runs?.[0]?.text || '',
              thumbnailUrl: gp.thumbnail?.thumbnails?.slice(-1)[0]?.url || ''
            });
          }
        }

        // 4. Videos list (from Videos tab or richGridRenderer)
        const videosList = [];
        const vidTab = tabs.find(t => t.tabRenderer?.title === 'Video' || t.tabRenderer?.title === 'Videos');
        const richContents = vidTab?.tabRenderer?.content?.richGridRenderer?.contents ||
                             data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(t => t.tabRenderer?.selected)?.tabRenderer?.content?.richGridRenderer?.contents || [];
        for (const rc of richContents) {
          const lk = rc.richItemRenderer?.content?.lockupViewModel;
          if (lk) {
            const vTitle = lk.metadata?.lockupMetadataViewModel?.title?.content || '';
            const vThumb = lk.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${lk.contentId}/hqdefault.jpg`;
            const rows = lk.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
            const subParts = [];
            for (const r of rows) {
              for (const mp of (r.metadataParts || [])) {
                if (mp.text?.content) subParts.push(mp.text.content);
              }
            }
            const overlays = lk.contentImage?.thumbnailViewModel?.overlays || [];
            let dur = '';
            let isMus = false;
            for (const ov of overlays) {
              const bm = ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel;
              if (bm?.text) dur = bm.text;
              if (bm?.icon?.sources?.[0]?.clientResource?.imageName === 'MUSIC') isMus = true;
            }
            videosList.push({
              id: lk.contentId,
              title: vTitle,
              duration: dur || '10:00',
              isMusic: isMus,
              views: subParts[0] || '10 N',
              uploadedAt: subParts[1] || 'Gần đây',
              thumbnailUrl: vThumb
            });
          }
        }

        // 5. Authentic Community Posts (from /posts tab)
        const postsList = [];
        let postsData = data;
        if (tab !== 'posts' && tab !== 'community') {
          try {
            const cleanBase = targetUrl.split('?')[0].replace(/\/videos|\/playlists|\/shorts|\/featured|\/streams/, '');
            const postsUrl = `${cleanBase}/posts`;
            const postsHtml = await fetchYT(postsUrl);
            const pm = postsHtml.match(/var ytInitialData = ({.*?});<\/script>/s);
            if (pm) postsData = JSON.parse(pm[1]);
          } catch (e) {}
        }

        const pTabs = postsData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const postTab = pTabs.find(t => t.tabRenderer?.selected || t.tabRenderer?.title?.includes('Bài đăng') || t.tabRenderer?.title?.includes('Community'));
        const pContents = postTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
        for (const it of pContents) {
          const thread = it.backstagePostThreadRenderer;
          const post = thread?.post?.backstagePostRenderer || thread?.post?.sharedPostRenderer;
          if (post) {
            const pText = post.contentText?.runs?.map(r => r.text).join('') || '';
            const pTime = post.publishedTimeText?.runs?.[0]?.text || '';
            const pVotes = post.voteCount?.simpleText || '0';
            const pAuthor = post.authorText?.runs?.[0]?.text || chName;
            const pThumb = post.authorThumbnail?.thumbnails?.slice(-1)[0]?.url || avatar;
            const pImg = post.backstageAttachment?.backstageImageRenderer?.image?.thumbnails?.slice(-1)[0]?.url || '';
            let pVid = null;
            const vr = post.backstageAttachment?.videoRenderer;
            if (vr) {
              pVid = {
                id: vr.videoId,
                title: vr.title?.runs?.[0]?.text || '',
                thumbnailUrl: vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
                views: vr.viewCountText?.simpleText || '',
                uploadedAt: vr.publishedTimeText?.simpleText || ''
              };
            }
            let pPoll = null;
            const pr = post.backstageAttachment?.pollRenderer;
            if (pr) {
              pPoll = {
                choices: pr.choices?.map(c => c.text?.runs?.map(r => r.text).join('') || c.text?.simpleText || '') || [],
                totalVotes: pr.totalVotes?.simpleText || ''
              };
            }
            postsList.push({
              id: post.postId || `post_${Date.now()}_${Math.random()}`,
              author: pAuthor,
              authorThumb: pThumb.startsWith('//') ? `https:${pThumb}` : pThumb,
              time: pTime,
              text: pText,
              votes: pVotes,
              image: pImg,
              video: pVid,
              poll: pPoll,
              likesCount: pVotes
            });
          }
        }

        const result = {
          success: true,
          title: chName,
          avatar,
          banner,
          subscribers,
          videoCount,
          description: chDesc,
          channel: {
            id,
            name: chName,
            handle,
            subscribers,
            videoCount,
            avatar,
            banner,
            description: chDesc,
            isVerified: true,
            primaryLink: { title: primaryLinkTitle, url: primaryLinkUrl },
            linksSuffix,
            links: linksList,
            about: {
              description: chDesc,
              country: 'Việt Nam',
              joinedDate: 'Đã tham gia YouTube',
              links: linksList
            }
          },
          homeShelves,
          playlists,
          videos: videosList,
          posts: postsList
        };

        ytChannelCache.set(cacheKey, result);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddlewaresPlugin()],
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api': {
        target: 'https://y.com.sb',
        changeOrigin: true,
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      },
      '/yt-oembed': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/yt-oembed/, '/oembed'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
              'Cookie': 'PREF=hl=vi&gl=VN',
          'X-Forwarded-For': '113.190.86.86'
        }
      },
      '/yt-suggest': {
        target: 'https://suggestqueries.google.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/yt-suggest/, '/complete/search'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  },
  build: {
    // Keep sourcemaps off in production for security
    sourcemap: false,
    rollupOptions: {
      output: {
        // Ensure proper cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  }
})
