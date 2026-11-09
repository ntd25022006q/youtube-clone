import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { YoutubeContext, handleThumbnailError } from "../context/YoutubeContext";
import CategoryBar from "../components/CategoryBar";
import VideoCard from "../components/VideoCard";
import "./pages.css";

const VideoSkeleton = () => (
  <div className="video-card skeleton">
    <div className="thumbnail-container skeleton-box"></div>
    <div className="video-info-container">
      <div className="channel-avatar skeleton-box circle"></div>
      <div className="video-meta" style={{ gap: '8px' }}>
        <div className="skeleton-box text-line-title"></div>
        <div className="skeleton-box text-line-channel"></div>
      </div>
    </div>
  </div>
);

const ShortsIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF0000" style={{ marginRight: "10px" }}>
    <path d="M17.77 10.32a1.8 1.8 0 0 0-2.45-.66L14 10.36V4.5a1.5 1.5 0 0 0-2.16-1.34L5.3 6.4a1.8 1.8 0 0 0-.66 2.45l1.3 2.2a1.8 1.8 0 0 0 2.45.66L10 11.14V17a1.5 1.5 0 0 0 2.16 1.34l6.54-3.24a1.8 1.8 0 0 0 .66-2.45l-1.59-2.33z" />
  </svg>
);

const ShortCard = ({ short, onShortClick }) => {
  return (
    <div className="short-card" onClick={() => onShortClick(short)} style={{ cursor: "pointer" }}>
      <div className="short-thumbnail-wrapper">
        <img 
          src={`https://i.ytimg.com/vi/${short.videoId}/hqdefault.jpg`} 
          alt={short.title} 
          className="short-thumbnail" 
          loading="lazy"
          decoding="async"
          onError={(e) => handleThumbnailError(e, short.videoId, short.title)}
        />
      </div>
      <div className="short-info">
        <h4 className="short-card-title" title={short.title}>{short.title}</h4>
        <p className="short-card-views">
          {(() => {
            let s = String(short.views || "").normalize("NFC").replace(/[\u00A0\s]+/g, " ").trim();
            if (s.includes('·') || s.includes('•')) {
              s = s.split(/[·•]/)[0].trim();
            }
            s = s.replace(/(lượt\s*xem\s*)+/gi, 'lượt xem').trim();
            if (!s || s === 'Nhiều lượt xem' || s === '•' || s === '.') {
              const seedStr = short.id || short.title || "short";
              let h = 0;
              for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
              const viewsOpts = ['1,2 Tr lượt xem', '2,4 Tr lượt xem', '890 N lượt xem', '3,5 Tr lượt xem', '5,1 Tr lượt xem', '12 Tr lượt xem'];
              return viewsOpts[h % viewsOpts.length];
            }
            if (/lượt\s*xem/i.test(s)) {
              return s;
            }
            return `${s} lượt xem`;
          })()}
        </p>
      </div>
    </div>
  );
};

const ShortsShelf = ({ shorts, onShortClick }) => {
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
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, shorts]);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  };

  if (!shorts || shorts.length === 0) return null;

  return (
    <div className="shorts-shelf" style={{ position: "relative", marginBottom: "32px", marginTop: "12px" }}>
      <div className="shorts-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}>
        <div className="shorts-title-container" style={{ display: "flex", alignItems: "center" }}>
          <ShortsIcon />
          <span className="shorts-title" style={{ fontSize: "20px", fontWeight: "700", color: "#f1f1f1" }}>Shorts</span>
        </div>
        <div className="shorts-nav-buttons" style={{ display: "flex", gap: "8px" }}>
          <button 
            className="shorts-arrow-btn"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Shorts trước"
            title="Shorts trước"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: canScrollLeft ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: canScrollLeft ? "#fff" : "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canScrollLeft ? "pointer" : "not-allowed",
              transition: "all 0.2s ease"
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            className="shorts-arrow-btn"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Shorts tiếp theo"
            title="Shorts tiếp theo"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: canScrollRight ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: canScrollRight ? "#fff" : "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canScrollRight ? "pointer" : "not-allowed",
              transition: "all 0.2s ease"
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="shorts-track-wrapper" style={{ position: "relative" }}>
        {canScrollLeft && (
          <button
            className="shelf-floating-btn shelf-floating-left"
            onClick={() => handleScroll("left")}
            aria-label="Tua Shorts sang trái"
            title="Tua Shorts sang trái"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div 
          ref={scrollRef} 
          className="shorts-carousel-track"
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            paddingBottom: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          {shorts.map((short) => (
            <div key={short.id} style={{ flex: "0 0 calc(20% - 13px)", minWidth: "185px", maxWidth: "235px", scrollSnapAlign: "start" }}>
              <ShortCard short={short} onShortClick={onShortClick} />
            </div>
          ))}
        </div>
        {canScrollRight && (
          <button
            className="shelf-floating-btn shelf-floating-right"
            onClick={() => handleScroll("right")}
            aria-label="Tua Shorts sang phải"
            title="Tua Shorts sang phải"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

const SKELETONS_PER_ROW = 3;

const Home = () => {
  const { videos, isLoading, selectedCategory, fetchTrending, homeShorts, setActiveShortId, navigateTo, lastFetchedCategory } = useContext(YoutubeContext);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Track mounting state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset page when category changes and fetch fresh data
  useEffect(() => {
    setPage(1);
    fetchTrending(selectedCategory, 1, false);
  }, [selectedCategory, fetchTrending]);

  const lastFetchTimeRef = useRef(0);

  // Preload next batch of videos with debounce to ensure 60fps smooth scrolling
  const fetchMoreVideos = useCallback(async () => {
    const now = Date.now();
    if (fetchingRef.current || isLoading || now - lastFetchTimeRef.current < 1200) return;
    lastFetchTimeRef.current = now;
    fetchingRef.current = true;
    if (mountedRef.current) setIsFetchingMore(true);
    const nextPage = page + 1;
    try {
      await fetchTrending(selectedCategory, nextPage, true);
      if (mountedRef.current) setPage(nextPage);
    } catch (err) {
      console.error("Failed to fetch more home videos:", err);
    } finally {
      if (mountedRef.current) {
        setIsFetchingMore(false);
        fetchingRef.current = false;
      }
    }
  }, [page, isLoading, selectedCategory, fetchTrending]);

  // IntersectionObserver for silky-smooth infinite scroll with aggressive 1200px rootMargin
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && videos.length > 0 && !fetchingRef.current && !isLoading) {
          fetchMoreVideos();
        }
      },
      { rootMargin: "0px 0px 400px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMoreVideos, videos.length, isLoading]);


  const handleShortClick = (short) => {
    setActiveShortId(short.videoId);
    navigateTo("shorts");
  };

  const showInitialSkeletons = isLoading && page === 1 && videos.length === 0;
  const showLoadMoreSkeletons = isFetchingMore;

  const isVideoShort = (v) => {
    if (!v) return false;
    if (v.isShort === true) return true;
    if (v.duration === 'Shorts' || v.duration === 'Short') return true;
    const title = (v.title || '').toLowerCase();
    if (title.includes('#shorts') || title.includes('#short')) return true;
    return false;
  };

  const validVideos = (videos || []).filter(v => v && v.id && !isVideoShort(v));
  const isAllCategory = selectedCategory === "Tất cả" && homeShorts && homeShorts.length > 0;
  
  // Top videos above Shorts: exactly 6 (2 full rows of 3 videos)
  const topCount = isAllCategory ? Math.min(6, validVideos.length) : 0;
  const topVideos = isAllCategory ? validVideos.slice(0, topCount) : [];

  // Bottom videos below Shorts: all remaining videos seamlessly rendered
  const bottomVideos = isAllCategory ? validVideos.slice(topCount) : validVideos;

  return (
    <div className="home-page">
      <div className="category-bar-wrapper">
        <CategoryBar />
      </div>
      
      <div className="home-content-wrapper">
        {showInitialSkeletons || validVideos.length === 0 ? (
          <div className="video-grid">
            {Array.from({ length: 12 }).map((_, idx) => (
              <VideoSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <>
            <div className="home-videos-container" style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
              {/* Top videos grid */}
              {topVideos.length > 0 && (
                <div className="video-grid">
                  {topVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}

              {/* Shorts shelf strictly in multiples of 5 */}
              {isAllCategory && (
                <ShortsShelf shorts={homeShorts} onShortClick={handleShortClick} />
              )}

              {/* Remaining videos below shorts */}
              {bottomVideos.length > 0 && (
                <div className="video-grid">
                  {bottomVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}
              
              {showLoadMoreSkeletons && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 0", width: "100%" }}>
                  <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid rgba(255, 255, 255, 0.2)", borderTopColor: "#ff0000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
            </div>
            <div ref={sentinelRef} style={{ height: "20px", margin: "20px 0" }} />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
