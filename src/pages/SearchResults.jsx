import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { Bell, Search, Play, Sparkles, SlidersHorizontal, Check, X, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { YoutubeContext, getFallbackAvatar, translateDateVi, resolveChannelAvatar, resolveVideoThumbnail, searchMockVideos, handleThumbnailError } from "../context/YoutubeContext";
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


const OfficialChannelHeroCard = ({ card, onVideoSelect, onChannelSelect, onPlaylistSelect, subscriptions, toggleSubscribe }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const t = setTimeout(checkScroll, 150);
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        clearTimeout(t);
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
    return () => clearTimeout(t);
  }, [checkScroll, card]);

  const handleScroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth"
    });
  };

  const isSubbed = subscriptions.includes(card.channelId || card.handle);

  return (
    <div className="youtube-official-card">
      <div className="youtube-official-card-header">
        <img
          src={card.avatar || "https://yt3.googleusercontent.com/OGoVXsNiIH4u2GueffG5olXSQ_-HrHrj-71ju_ceszaGl8_iNNSrqnLYJDjpn7jwsVwUwBBpKQ=s176-c-k-c0x00ffffff-no-rj-mo"}
          alt={card.title}
          className="official-avatar"
          onClick={() => onChannelSelect({ id: card.channelId || card.handle, name: card.title })}
          style={{ cursor: "pointer" }}
        />
        <div className="official-info">
          <div className="official-name-row">
            <h2
              className="official-name"
              onClick={() => onChannelSelect({ id: card.channelId || card.handle, name: card.title })}
              style={{ cursor: "pointer" }}
            >
              {card.title}
            </h2>
            <span className="official-music-badge" title="Nghệ sĩ chính thức" style={{ color: "#aaa", display: "inline-flex", alignItems: "center" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </span>
          </div>
          <p className="official-meta">
            <span>{card.handle}</span>
            {card.subscribers && (
              <>
                <span style={{ margin: "0 6px" }}>•</span>
                <span>{card.subscribers}</span>
              </>
            )}
            {card.videoCount && (
              <>
                <span style={{ margin: "0 6px" }}>•</span>
                <span>{card.videoCount}</span>
              </>
            )}
          </p>
          <div className="official-actions-row">
            <button
              className={`official-btn-sub ${isSubbed ? "subscribed" : ""}`}
              onClick={() => toggleSubscribe(card.channelId || card.handle)}
            >
              {isSubbed ? (
                <>
                  <Bell size={16} />
                  <span>Đã đăng ký</span>
                </>
              ) : (
                <span>Đăng ký</span>
              )}
            </button>
            <button
              className="official-btn-action"
              onClick={() => onChannelSelect({ id: card.channelId || card.handle, name: card.title })}
            >
              <span>Xem kênh</span>
            </button>
            <button
              className="official-btn-action"
              onClick={() => {
                if (onPlaylistSelect && card.carousel && card.carousel.length > 0) {
                  const items = card.carousel.map(c => ({
                    id: c.id,
                    title: c.title,
                    thumbnailUrl: c.thumbnail,
                    duration: c.badge || "3:30",
                    author: card.title
                  }));
                  onPlaylistSelect({
                    title: `Tuyển tập - ${card.title}`,
                    author: card.title,
                    items
                  }, 0);
                } else if (card.carousel?.[0]) {
                  onVideoSelect({ id: card.carousel[0].id, title: card.carousel[0].title });
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: 4 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              <span>Tuyển tập</span>
            </button>
            <a
              href={`https://music.youtube.com/search?q=${encodeURIComponent(card.title)}`}
              target="_blank"
              rel="noreferrer"
              className="official-btn-action"
              style={{ textDecoration: "none" }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff0000" style={{ marginRight: 4 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
              </svg>
              <span>YouTube Music</span>
            </a>
          </div>
        </div>
      </div>

      {card.carousel && card.carousel.length > 0 && (
        <div className="official-carousel-wrapper" style={{ position: "relative" }}>
          {canScrollLeft && (
            <button
              className="shelf-floating-btn shelf-floating-left"
              onClick={() => handleScroll("left")}
              aria-label="Tua sang trái"
              title="Tua sang trái"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <div className="official-carousel-track" ref={scrollRef}>
            {card.carousel.map((item, idx) => (
              <div
                key={item.id || idx}
                className="official-card-item"
                onClick={() => {
                  if (item.isPlaylist || item.title?.includes('Tổng hợp') || item.id?.startsWith('RD') || item.id?.startsWith('PL')) {
                    if (onPlaylistSelect && card.carousel && card.carousel.length > 0) {
                      const items = card.carousel.map(c => ({
                        id: c.id,
                        title: c.title,
                        thumbnailUrl: c.thumbnail,
                        duration: c.badge || "3:30",
                        author: card.title
                      }));
                      onPlaylistSelect({
                        title: item.title,
                        author: card.title,
                        items
                      }, 0);
                      return;
                    }
                  }
                  onVideoSelect({
                    id: item.id,
                    title: item.title,
                    thumbnailUrl: item.thumbnail,
                    views: item.meta,
                    duration: item.badge
                  });
                }}
              >
                <div className="official-card-thumb-wrapper">
                  <img
                    src={(() => {
                      const t = item.thumbnail || '';
                      if (!t || t.includes('3dots') || t.includes('skeleton') || t.includes('default-user') || item.title?.includes('Tổng hợp') || item.isPlaylist || item.id?.startsWith('RD')) {
                        return 'https://i.ytimg.com/vi/FN7ALfpGxiI/hqdefault.jpg';
                      }
                      return t;
                    })()}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onLoad={(e) => {
                      if (e.target.naturalWidth <= 120 && e.target.naturalHeight <= 90) {
                        e.target.src = 'https://i.ytimg.com/vi/FN7ALfpGxiI/hqdefault.jpg';
                      }
                    }}
                    onError={(e) => {
                      e.target.src = 'https://i.ytimg.com/vi/FN7ALfpGxiI/hqdefault.jpg';
                    }}
                  />
                  {item.badge && (
                    <span className="official-card-badge">
                      {item.isPlaylist ? (
                        <>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                          </svg>
                          <span>{item.badge}</span>
                        </>
                      ) : (
                        <span>{item.badge}</span>
                      )}
                    </span>
                  )}
                  {idx === 1 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#ff0000" }}></div>
                  )}
                </div>
                <div className="official-card-info">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 className="official-card-title" title={item.title}>{item.title}</h4>
                    <button
                      className="icon-btn"
                      style={{ padding: 2, color: "#aaa", background: "transparent", border: "none", cursor: "pointer" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className="official-card-meta">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
          {canScrollRight && (
            <button
              className="shelf-floating-btn shelf-floating-right"
              onClick={() => handleScroll("right")}
              aria-label="Tua sang phải"
              title="Tua sang phải"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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
    handlePlaylistSelect,
  } = useContext(YoutubeContext);

  // Use LOCAL state for search results so it doesn't overwrite the global videos
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlQuery = searchParams?.get("search_query") || searchParams?.get("q") || "";
  const effectiveQuery = (searchQuery && searchQuery.trim()) ? searchQuery.trim() : urlQuery.trim();

  const [searchResults, setSearchResults] = useState([]);
  const [officialCard, setOfficialCard] = useState(null);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [localLoading, setLocalLoading] = useState(false);
  const prevQueryRef = useRef("");
  const mountedRef = useRef(true);

  // Search Filter States
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, video, channel
  const [filterDuration, setFilterDuration] = useState("all"); // all, short, medium, long
  const [filterSort, setFilterSort] = useState("relevance"); // relevance, views, date

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
    if (!append && mountedRef.current) {
      setLocalLoading(true);
      setOfficialCard(null);
    }
    try {
      if (pg === 1 && !append) {
        try {
          const ytRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData && ytData.success) {
              if (ytData.officialCard) {
                setOfficialCard(ytData.officialCard);
              }
              if (Array.isArray(ytData.videos) && ytData.videos.length > 0) {
                const mappedVids = ytData.videos.map(v => ({
                  type: "video",
                  id: v.id,
                  title: v.title,
                  duration: v.duration,
                  views: v.views,
                  uploadedAt: v.uploadedAt,
                  thumbnailUrl: v.thumbnailUrl,
                  channel: v.channel
                }));
                if (ytData.channelCard && !ytData.officialCard) {
                  mappedVids.unshift({
                    type: "channel",
                    ...ytData.channelCard
                  });
                }
                setSearchResults(mappedVids);
                setHasMore(true);
                return;
              }
            }
          }
        } catch (ytErr) {
          console.warn("Direct YT search fallback to Invidious", ytErr);
        }
      }
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

      let finalResults = mapped;
      if (!append && finalResults.length === 0) {
        const mockFallback = searchMockVideos(query);
        if (mockFallback && mockFallback.length > 0) {
          finalResults = mockFallback;
        }
      }

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
      console.warn("Local search fetch failed, falling back to mock search", e);
      if (!mountedRef.current) return;
      if (!append) {
        const mockFallback = searchMockVideos(query);
        setSearchResults(mockFallback || []);
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
    if (effectiveQuery && effectiveQuery !== prevQueryRef.current) {
      prevQueryRef.current = effectiveQuery;
      setPage(1);
      setHasMore(true);
      doSearch(effectiveQuery, 1, false);
    }
  }, [effectiveQuery, doSearch]);

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

  const loading = (localLoading || isLoading) && page === 1;

  const filteredResults = searchResults.filter((item) => {
    if (filterType === "video" && item.type !== "video") return false;
    if (filterType === "channel" && item.type !== "channel") return false;
    
    if (item.type === "video") {
      const secs = item.lengthSeconds || 0;
      if (filterDuration === "short" && secs > 240) return false;
      if (filterDuration === "medium" && (secs <= 240 || secs > 1200)) return false;
      if (filterDuration === "long" && secs <= 1200) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filterSort === "views") {
      return (b.viewsCount || 0) - (a.viewsCount || 0);
    }
    return 0;
  });

  // Resolve featured artist and top videos for the right-side panel
  const featuredChannel = filteredResults.find(item => item.type === "channel") || 
                          (filteredResults[0]?.type === "video" ? filteredResults[0].channel : null);

  const topVideos = filteredResults.filter(item => item.type === "video");

  return (
    <div className="search-results-page">
      <div className="search-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 className="search-info" style={{ margin: 0 }}>
          Kết quả tìm kiếm cho: <span className="query-highlight">"{searchQuery}"</span>
        </h2>
        <button 
          className={`search-filter-toggle-btn ${showFilterDrawer ? "active" : ""}`}
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: showFilterDrawer ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
            border: "none",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "18px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px"
          }}
        >
          <SlidersHorizontal size={16} />
          <span>Bộ lọc</span>
        </button>
      </div>

      {/* Slide-down YouTube Search Filters Drawer */}
      {showFilterDrawer && (
        <div className="search-filter-drawer" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px", padding: "16px 20px", background: "#1f1f1f", borderRadius: "12px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Column 1: Loại */}
          <div>
            <h4 style={{ fontSize: "12px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Loại</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <span style={{ cursor: "pointer", color: filterType === "all" ? "#3ea6ff" : "#fff", fontWeight: filterType === "all" ? "600" : "400" }} onClick={() => setFilterType("all")}>Tất cả</span>
              <span style={{ cursor: "pointer", color: filterType === "video" ? "#3ea6ff" : "#fff", fontWeight: filterType === "video" ? "600" : "400" }} onClick={() => setFilterType("video")}>Video</span>
              <span style={{ cursor: "pointer", color: filterType === "channel" ? "#3ea6ff" : "#fff", fontWeight: filterType === "channel" ? "600" : "400" }} onClick={() => setFilterType("channel")}>Kênh</span>
            </div>
          </div>

          {/* Column 2: Thời lượng */}
          <div>
            <h4 style={{ fontSize: "12px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Thời lượng</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <span style={{ cursor: "pointer", color: filterDuration === "all" ? "#3ea6ff" : "#fff", fontWeight: filterDuration === "all" ? "600" : "400" }} onClick={() => setFilterDuration("all")}>Tất cả</span>
              <span style={{ cursor: "pointer", color: filterDuration === "short" ? "#3ea6ff" : "#fff", fontWeight: filterDuration === "short" ? "600" : "400" }} onClick={() => setFilterDuration("short")}>Dưới 4 phút</span>
              <span style={{ cursor: "pointer", color: filterDuration === "medium" ? "#3ea6ff" : "#fff", fontWeight: filterDuration === "medium" ? "600" : "400" }} onClick={() => setFilterDuration("medium")}>4 - 20 phút</span>
              <span style={{ cursor: "pointer", color: filterDuration === "long" ? "#3ea6ff" : "#fff", fontWeight: filterDuration === "long" ? "600" : "400" }} onClick={() => setFilterDuration("long")}>Trên 20 phút</span>
            </div>
          </div>

          {/* Column 3: Sắp xếp theo */}
          <div>
            <h4 style={{ fontSize: "12px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Sắp xếp theo</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <span style={{ cursor: "pointer", color: filterSort === "relevance" ? "#3ea6ff" : "#fff", fontWeight: filterSort === "relevance" ? "600" : "400" }} onClick={() => setFilterSort("relevance")}>Mức độ liên quan</span>
              <span style={{ cursor: "pointer", color: filterSort === "views" ? "#3ea6ff" : "#fff", fontWeight: filterSort === "views" ? "600" : "400" }} onClick={() => setFilterSort("views")}>Lượt xem</span>
            </div>
          </div>
        </div>
      )}

      <div className="search-layout-wrapper">
        <div className="search-results-left">
          {officialCard && (
            <OfficialChannelHeroCard
              card={officialCard}
              onVideoSelect={handleVideoSelect}
              onChannelSelect={handleChannelSelect}
              onPlaylistSelect={handlePlaylistSelect}
              subscriptions={subscriptions}
              toggleSubscribe={toggleSubscribe}
            />
          )}
          {loading ? (
            <div className="search-results-list">
              {Array.from({ length: 6 }).map((_, idx) => (
                <SearchRowSkeleton key={idx} />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="no-results">
              <Search size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <h3>Không tìm thấy kết quả phù hợp với bộ lọc</h3>
              <p>Hãy thử thay đổi hoặc đặt lại bộ lọc tìm kiếm của bạn.</p>
            </div>
          ) : (
            <div className="search-results-list">
              {filteredResults.map((item, idx) => {
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
                            className="search-channel-avatar" referrerPolicy="no-referrer"
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
                                    src={chVid.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${chVid.videoId}/sddefault.jpg`} 
                                    alt={chVid.title} 
                                    className="shelf-video-thumb"
                                    onError={(e) => handleThumbnailError(e, chVid.videoId, chVid.title)}
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
                    key={`search_vid_${video.id}_${idx}`}
                    className="search-result-row"
                    onClick={() => handleVideoSelect(video)}
                    onMouseEnter={() => {
                      prefetchVideo(video);
                      prefetchChannel(video.channel);
                    }}
                  >
                    <div className="search-row-thumbnail-container">
                      <img
                        src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`}
                        alt={video.title}
                        className="search-row-thumbnail"
                        onError={(e) => handleThumbnailError(e, video.id, video.title)}
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
                          className="search-row-channel-avatar" referrerPolicy="no-referrer"
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
