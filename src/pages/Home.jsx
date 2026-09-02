import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { YoutubeContext } from "../context/YoutubeContext";
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
  const [imgFailed, setImgFailed] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(short.videoId);

  const handleImgError = () => {
    if (!imgFailed) {
      setImgFailed(true);
      const fallbacks = ["Z0Ga3sU1oBo", "JGwWNGJdvx8", "9bZkp7q19f0", "OPf0YbXqDm0", "ktvTqknDobU", "2vjPBrBU-TM"];
      const randomId = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      setCurrentVideoId(randomId);
    }
  };

  return (
    <div className="short-card" onClick={() => onShortClick({ ...short, videoId: currentVideoId })} style={{ cursor: "pointer" }}>
      <div className="short-thumbnail-wrapper">
        <img 
          src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`} 
          alt={short.title} 
          className="short-thumbnail" 
          loading="eager"
          fetchPriority="high"
          onError={handleImgError}
        />
      </div>
      <div className="short-info">
        <h4 className="short-card-title" title={short.title}>{short.title}</h4>
        <p className="short-card-views">{short.views} lượt xem</p>
      </div>
    </div>
  );
};

const ShortsShelf = ({ shorts, onShortClick }) => {
  if (!shorts || shorts.length === 0) return null;
  return (
    <div className="shorts-shelf">
      <div className="shorts-header">
        <div className="shorts-title-container">
          <ShortsIcon />
          <span className="shorts-title">Shorts</span>
        </div>
      </div>
      <div className="shorts-grid">
        {shorts.slice(0, 5).map((short) => (
          <ShortCard key={short.id} short={short} onShortClick={onShortClick} />
        ))}
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

  const [isTransitioning, setIsTransitioning] = useState(false);

  const getTopSliceCount = () => {
    if (typeof window === "undefined") return 8;
    const w = window.innerWidth;
    if (w >= 1900) return 10;
    if (w >= 1400) return 8;
    if (w >= 1200) return 6;
    return 6;
  };

  const [topSliceCount, setTopSliceCount] = useState(getTopSliceCount);

  useEffect(() => {
    const handleResize = () => {
      setTopSliceCount(getTopSliceCount());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset page when category changes and fetch fresh data
  useEffect(() => {
    setPage(1);
    if (mountedRef.current) setIsTransitioning(true);
    const t = setTimeout(() => {
      if (mountedRef.current) setIsTransitioning(false);
    }, 280);
    fetchTrending(selectedCategory, 1, false);
    return () => clearTimeout(t);
  }, [selectedCategory, fetchTrending]);

  // Preload next batch of videos aggressively in background
  const fetchMoreVideos = useCallback(async () => {
    if (fetchingRef.current || isLoading) return;
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
      { rootMargin: "0px 0px 1200px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMoreVideos, videos.length, isLoading]);


  const handleShortClick = (short) => {
    setActiveShortId(short.videoId);
    navigateTo("shorts");
  };

  const showInitialSkeletons = isLoading && page === 1 && videos.length === 0;
  const showLoadMoreSkeletons = isFetchingMore || (isLoading && page > 1);

  return (
    <div className="home-page">
      <div className="category-bar-wrapper">
        <CategoryBar />
      </div>
      
      <div className={`home-content-wrapper ${isTransitioning ? "transitioning" : ""}`}>
        {showInitialSkeletons ? (
        <div className="video-grid">
          {Array.from({ length: 12 }).map((_, idx) => (
            <VideoSkeleton key={idx} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="no-videos">
          <h2>Không tìm thấy video nào</h2>
          <p>Vui lòng kiểm tra kết nối mạng hoặc chọn danh mục khác.</p>
        </div>
      ) : (
        <>
          <div className="home-videos-container" style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
            {/* Top videos grid */}
            <div className="video-grid">
              {videos.slice(0, selectedCategory === "Tất cả" && homeShorts && homeShorts.length > 0 ? topSliceCount : videos.length).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>

            {/* Shorts shelf in between full rows without breaking grid columns */}
            {selectedCategory === "Tất cả" && homeShorts && homeShorts.length > 0 && (
              <ShortsShelf shorts={homeShorts} onShortClick={handleShortClick} />
            )}

            {/* Remaining videos below shorts */}
            {selectedCategory === "Tất cả" && homeShorts && homeShorts.length > 0 && videos.length > topSliceCount && (
              <div className="video-grid">
                {videos.slice(topSliceCount).map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
            
            {showLoadMoreSkeletons && (
              <div className="video-grid">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <VideoSkeleton key={`load-sk-${idx}`} />
                ))}
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
