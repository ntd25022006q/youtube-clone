import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { Bell, Search, Play, Sparkles } from "lucide-react";
import { YoutubeContext, getFallbackAvatar, translateDateVi, resolveChannelAvatar, resolveVideoThumbnail } from "../context/YoutubeContext";
import "./pages.css";

const SearchRowSkeleton = () => (
  <div className="search-result-row skeleton">
    <div className="search-row-thumbnail-container skeleton-box"></div>
    <div className="search-row-details" style={{ gap: '12px', padding: '8px 0' }}>
      <div className="skeleton-box text-line-title" style={{ height: '20px', width: '70%' }}></div>
      <div className="skeleton-box text-line-channel" style={{ height: '14px', width: '30%' }}></div>
      <div className="skeleton-box text-line-channel" style={{ height: '14px', width: '50%' }}></div>
    </div>
  </div>
);

const VerifiedBadge = () => (
  <svg
    viewBox="0 0 24 24"
    width="13"
    height="13"
    fill="currentColor"
    className="verified-badge-icon"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "4px", color: "#aaa" }}
    title="Đã xác minh"
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const SearchResults = () => {
  const {
    isLoading,
    searchQuery,
    fetchSearchResults,
    handleVideoSelect,
    handleChannelSelect,
    subscriptions,
    toggleSubscribe,
    prefetchVideo,
    prefetchChannel,
    fetchFromInvidious,
    channelAvatars,
  } = useContext(YoutubeContext);

  // Use LOCAL state for search results so it doesn't overwrite the global videos
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const prevQueryRef = useRef("");
  const mountedRef = useRef(true);

  // States for channel videos shelf
  const [channelVideos, setChannelVideos] = useState([]);
  const [loadingChannelVideos, setLoadingChannelVideos] = useState(false);

  // Resolve search channel card
  const searchChannelCard = searchResults.find(item => item.type === "channel");

  // Fetch latest videos for the search channel card
  useEffect(() => {
    if (searchChannelCard && searchChannelCard.id) {
      setLoadingChannelVideos(true);
      fetchFromInvidious(`/api/v1/channels/${searchChannelCard.id}/videos`)
        .then(({ data }) => {
          if (data && Array.isArray(data.videos)) {
            setChannelVideos(data.videos.slice(0, 3));
          } else if (Array.isArray(data)) {
            setChannelVideos(data.slice(0, 3));
          } else {
            setChannelVideos([]);
          }
        })
        .catch(err => {
          console.warn("Failed to fetch channel videos for search shelf:", err);
          setChannelVideos([]);
        })
        .finally(() => {
          setLoadingChannelVideos(false);
        });
    } else {
      setChannelVideos([]);
    }
  }, [searchChannelCard?.id, fetchFromInvidious]);

  // Track component mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Local fetch function that writes to local state
  const doSearch = useCallback(async (query, pg = 1, append = false) => {
    if (!query) return;
    if (!append && mountedRef.current) setLocalLoading(true);
    try {
      const path = `/api/v1/search?q=${encodeURIComponent(query)}&page=${pg}`;
      const { data, instance: usedInstance } = await fetchFromInvidious(
        path,
        (res) => Array.isArray(res) && res.length > 0 && res.some(v => v.videoId || v.authorId)
      );

      if (!data) {
        if (!append && mountedRef.current) setHasMore(false);
        return;
      }

      const mapped = data
        .filter(item => item.type === "video" || item.type === "channel")
        .map(item => {
          if (item.type === "video") {
            if (!item.videoId) return null;
            const thumbUrl = resolveVideoThumbnail(item.videoThumbnails, item.videoId, usedInstance);
            const chAvatar = (item.authorId && channelAvatars && channelAvatars[item.authorId])
              ? channelAvatars[item.authorId]
              : resolveChannelAvatar(item.authorThumbnails, item.author, usedInstance, item.authorId);
            const lengthSec = item.lengthSeconds || 0;
            const hrs = Math.floor(lengthSec / 3600);
            const mins = Math.floor((lengthSec % 3600) / 60);
            const secs = Math.floor(lengthSec % 60);
            const durStr = hrs > 0
              ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
              : `${mins}:${secs.toString().padStart(2, '0')}`;

            // Format view count
            const viewCount = item.viewCount || 0;
            let viewsStr = "0 lượt xem";
            if (viewCount >= 1000000) viewsStr = `${(viewCount / 1000000).toFixed(1).replace('.', ',')} Tr lượt xem`;
            else if (viewCount >= 1000) viewsStr = `${(viewCount / 1000).toFixed(0)} N lượt xem`;
            else if (viewCount > 0) viewsStr = `${viewCount} lượt xem`;

            // Translate date
            const dateStr = translateDateVi(item.publishedText);

            let subCount = item.subCount || 0;
            if (!subCount || subCount === 0) {
              let hash = 0;
              const nm = item.author || "";
              for (let i = 0; i < nm.length; i++) hash = nm.charCodeAt(i) + ((hash << 5) - hash);
              subCount = 10000 + (Math.abs(hash) % 5490000);
            }
            const isVerified = item.authorVerified === true || subCount > 100000;

            return {
              type: "video",
              id: item.videoId,
              title: item.title || "",
              description: item.description || "",
              thumbnailUrl: thumbUrl,
              duration: lengthSec > 0 ? durStr : item.duration || "",
              views: viewsStr,
              viewsCount: viewCount,
              uploadedAt: dateStr,
              videoUrl: `https://www.youtube-nocookie.com/embed/${item.videoId}`,
              channel: {
                id: item.authorId || "",
                name: item.author || "",
                avatar: chAvatar,
                isVerified,
                subscribers: ""
              },
              likes: "",
              likesCount: 0,
              comments: []
            };
          } else if (item.type === "channel") {
            if (!item.authorId) return null;
            const avUrl = (item.authorId && channelAvatars && channelAvatars[item.authorId])
              ? channelAvatars[item.authorId]
              : resolveChannelAvatar(item.authorThumbnails, item.author, usedInstance, item.authorId);
            const isVerified = item.authorVerified === true || (item.subCount || 0) > 100000;
            let subCount = item.subCount || 0;
            let subStr = "";
            if (subCount >= 1000000) subStr = `${(subCount / 1000000).toFixed(1).replace('.', ',')} Tr người đăng ký`;
            else if (subCount >= 1000) subStr = `${(subCount / 1000).toFixed(0)} N người đăng ký`;
            else if (subCount > 0) subStr = `${subCount} người đăng ký`;
            else subStr = "Nhiều người đăng ký";

            return {
              type: "channel",
              id: item.authorId,
              name: item.author,
              handle: item.channelHandle || `@${(item.author || "").toLowerCase().replace(/\s+/g, "")}`,
              avatar: avUrl,
              subscribers: subStr,
              subscribersCount: subCount,
              description: item.description || "",
              isVerified
            };
          }
          return null;
        })
        .filter(Boolean);

      const finalResults = mapped;
      if (!mountedRef.current) return;
      if (append) {
        setSearchResults(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          return [...prev, ...finalResults.filter(v => !existingIds.has(v.id))];
        });
      } else {
        setSearchResults(finalResults);
      }

      if (finalResults.length < 5) setHasMore(false);
      else setHasMore(true);

    } catch (e) {
      console.warn("Local search fetch failed", e);
      if (!mountedRef.current) return;
      if (!append) {
        setSearchResults([]);
        setHasMore(false);
      }
    } finally {
      if (mountedRef.current) {
        setLocalLoading(false);
        setIsFetchingMore(false);
      }
    }
  }, []);

  // Fetch when query changes
  useEffect(() => {
    if (searchQuery && searchQuery !== prevQueryRef.current) {
      prevQueryRef.current = searchQuery;
      setPage(1);
      setHasMore(true);
      doSearch(searchQuery, 1, false);
    }
  }, [searchQuery, doSearch]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = async () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.scrollHeight - 1200
      ) {
        if (!localLoading && !isFetchingMore && hasMore && searchQuery) {
          setIsFetchingMore(true);
          const nextPage = page + 1;
          await doSearch(searchQuery, nextPage, true);
          setPage(nextPage);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, localLoading, isFetchingMore, hasMore, searchQuery, doSearch]);

  const loading = localLoading && page === 1;

  // Resolve featured artist and top videos for the right-side panel
  const featuredChannel = searchResults.find(item => item.type === "channel") || 
                          (searchResults[0]?.type === "video" ? searchResults[0].channel : null);

  const topVideos = searchResults.filter(item => item.type === "video");

  return (
    <div className="search-results-page">
      <h2 className="search-info">
        Kết quả tìm kiếm cho: <span className="query-highlight">"{searchQuery}"</span>
      </h2>

      <div className="search-layout-wrapper">
        <div className="search-results-left">
          {loading ? (
            <div className="search-results-list">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SearchRowSkeleton key={idx} />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="no-results">
              <Search size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3>Không tìm thấy kết quả nào</h3>
              <p>Hãy thử tìm kiếm: "Nhạc trẻ mới nhất", "VTV24", hoặc "Sơn Tùng MTP".</p>
            </div>
          ) : (
            <div className="search-results-list">
              {searchResults.map((item) => {
                if (item.type === "channel") {
                  const isSubbed = subscriptions.includes(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <div
                        className="search-channel-card"
                        onClick={() => handleChannelSelect(item)}
                        onMouseEnter={() => prefetchChannel(item)}
                      >
                        <div className="search-channel-avatar-container">
                          <img
                            src={item.avatar || getFallbackAvatar(item.name)}
                            alt={item.name}
                            className="search-channel-avatar"
                            onError={e => { e.target.src = getFallbackAvatar(item.name); }}
                          />
                        </div>
                        <div className="search-channel-details">
                          <h2 className="search-channel-name">
                            {item.name}
                            {item.isVerified && <VerifiedBadge />}
                          </h2>
                          <p className="search-channel-meta">
                            <span>{item.handle}</span>
                            <span className="dot-separator">•</span>
                            <span>{item.subscribers}</span>
                          </p>
                          <p className="search-channel-desc">{item.description}</p>
                        </div>
                        <div className="search-channel-action">
                          <button
                            className={`subscribe-btn search-sub-btn ${isSubbed ? "subscribed" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubscribe(item.id);
                            }}
                          >
                            {isSubbed ? (
                              <>
                                <Bell size={16} style={{ marginRight: '6px' }} />
                                <span>Đã đăng ký</span>
                              </>
                            ) : (
                              "Đăng ký"
                            )}
                          </button>
                        </div>
                      </div>

                      {/* "Mới nhất từ..." Video Shelf */}
                      {channelVideos.length > 0 && (
                        <div className="search-channel-shelf">
                          <h4 className="shelf-title">Mới nhất từ {item.name}</h4>
                          <div className="shelf-videos-grid">
                            {channelVideos.map((chVid) => (
                              <div 
                                key={chVid.videoId} 
                                className="shelf-video-card"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVideoSelect({
                                    type: "video",
                                    id: chVid.videoId,
                                    title: chVid.title,
                                    thumbnailUrl: chVid.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${chVid.videoId}/hqdefault.jpg`,
                                    duration: chVid.duration || "",
                                    views: chVid.viewCount 
                                      ? `${
                                          chVid.viewCount >= 1000000 
                                            ? (chVid.viewCount/1000000).toFixed(1).replace('.', ',') + ' Tr' 
                                            : chVid.viewCount >= 1000 
                                              ? (chVid.viewCount/1000).toFixed(0) + ' N' 
                                              : chVid.viewCount
                                        } lượt xem` 
                                      : "",
                                    viewsCount: chVid.viewCount || 0,
                                    uploadedAt: translateDateVi(chVid.publishedText) || "",
                                    channel: {
                                      id: item.id,
                                      name: item.name,
                                      avatar: item.avatar,
                                      isVerified: item.isVerified
                                    }
                                  });
                                }}
                              >
                                <div className="shelf-video-thumb-wrapper">
                                  <img 
                                    src={chVid.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${chVid.videoId}/hqdefault.jpg`} 
                                    alt={chVid.title} 
                                    className="shelf-video-thumb"
                                    onError={e => { e.target.src = `https://img.youtube.com/vi/${chVid.videoId}/hqdefault.jpg`; }}
                                  />
                                  {chVid.lengthSeconds && (
                                    <span className="shelf-video-duration">
                                      {(() => {
                                        const secs = chVid.lengthSeconds;
                                        const m = Math.floor(secs / 60);
                                        const s = secs % 60;
                                        return `${m}:${s.toString().padStart(2, '0')}`;
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <div className="shelf-video-info">
                                  <h5 className="shelf-video-title" title={chVid.title}>{chVid.title}</h5>
                                  <div className="shelf-video-meta">
                                    <span>{chVid.viewCount 
                                      ? `${
                                          chVid.viewCount >= 1000000 
                                            ? (chVid.viewCount/1000000).toFixed(1).replace('.', ',') + ' Tr' 
                                            : chVid.viewCount >= 1000 
                                              ? (chVid.viewCount/1000).toFixed(0) + ' N' 
                                              : chVid.viewCount
                                        } lượt xem` 
                                      : ""}</span>
                                    <span className="dot-separator">•</span>
                                    <span>{translateDateVi(chVid.publishedText)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <hr className="shelf-divider" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                // Video row
                const video = item;
                return (
                  <div
                    key={video.id}
                    className="search-result-row"
                    onClick={() => handleVideoSelect(video)}
                    onMouseEnter={() => {
                      prefetchVideo(video);
                      prefetchChannel(video.channel);
                    }}
                  >
                    <div className="search-row-thumbnail-container">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="search-row-thumbnail"
                        onError={e => { e.target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`; }}
                      />
                      {video.duration && (
                        <span className="search-row-duration">{video.duration}</span>
                      )}
                    </div>
                    <div className="search-row-details">
                      <h3 className="search-row-title">{video.title}</h3>
                      <div className="search-row-stats">
                        <span>{video.views}</span>
                        {video.uploadedAt && (
                          <>
                            <span className="dot-separator">•</span>
                            <span>{video.uploadedAt}</span>
                          </>
                        )}
                      </div>
                      <div className="search-row-channel">
                        <img
                          src={video.channel.avatar || getFallbackAvatar(video.channel.name)}
                          alt={video.channel.name}
                          className="search-row-channel-avatar"
                          onError={e => { e.target.src = getFallbackAvatar(video.channel.name); }}
                        />
                        <span>
                          {video.channel.name}
                          {video.channel.isVerified && <VerifiedBadge />}
                        </span>
                      </div>
                      {video.description && (
                        <p className="search-row-description">{video.description.slice(0, 150)}{video.description.length > 150 ? "..." : ""}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll skeleton */}
              {isFetchingMore && (
                <>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <SearchRowSkeleton key={`more-${idx}`} />
                  ))}
                </>
              )}

              {!hasMore && searchResults.length > 0 && (
                <div style={{ textAlign: "center", padding: "24px", color: "#aaa", fontSize: "14px" }}>
                  Đã hiển thị tất cả kết quả tìm kiếm
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar Panel */}
        {!loading && searchResults.length > 0 && (
          <div className="search-results-right">
            {featuredChannel && (
              <div className="artist-right-panel-card">
                <img 
                  src={featuredChannel.avatar || getFallbackAvatar(featuredChannel.name)}
                  alt={featuredChannel.name}
                  className="artist-right-avatar"
                  onError={e => { e.target.src = getFallbackAvatar(featuredChannel.name); }}
                />
                <h3 className="artist-right-name">
                  {featuredChannel.name}
                  {featuredChannel.isVerified && <VerifiedBadge />}
                </h3>
                <p className="artist-right-handle">
                  {featuredChannel.handle || `@${featuredChannel.name.toLowerCase().replace(/\s+/g, "")}`}
                </p>
                <p className="artist-right-subs">
                  {featuredChannel.subscribers || "Nghệ sĩ chính thức"}
                </p>
                <button 
                  className={`subscribe-btn search-sub-btn ${subscriptions.includes(featuredChannel.id) ? "subscribed" : ""}`}
                  onClick={() => toggleSubscribe(featuredChannel.id)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {subscriptions.includes(featuredChannel.id) ? "Đã đăng ký" : "Đăng ký"}
                </button>
              </div>
            )}

            {topVideos.length >= 2 && (
              <div 
                className="playlist-collage-card" 
                onClick={() => handleVideoSelect(topVideos[0])}
              >
                <div className="playlist-collage-thumbnails">
                  <div className="playlist-collage-main">
                    <img src={topVideos[0].thumbnailUrl} alt="Thumbnail 1" />
                    <div className="collage-play-overlay">
                      <Play size={28} fill="#fff" color="#fff" />
                    </div>
                  </div>
                  <div className="playlist-collage-side">
                    <img src={topVideos[1].thumbnailUrl} alt="Thumbnail 2" />
                    {topVideos[2] && <img src={topVideos[2].thumbnailUrl} alt="Thumbnail 3" />}
                  </div>
                </div>
                <div className="playlist-collage-details">
                  <div className="playlist-title-row">
                    <Sparkles size={16} style={{ color: "#FF8F00" }} />
                    <span>Danh sách kết hợp trên YouTube</span>
                  </div>
                  <p className="playlist-subtitle">
                    Tuyển tập nhạc hay nhất của {featuredChannel?.name || "Nghệ sĩ"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
