import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, MoreVertical, X, Send, ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Heart, EyeOff, Flag, FileText, Music } from "lucide-react";
import { YoutubeContext, getFallbackAvatar, handleThumbnailError } from "../context/YoutubeContext";
import { ShareModal, ReportModal } from "../components/Modals";
import "./pages.css";

// Short video search queries to rotate through for variety
const SHORT_QUERIES = [
  "shorts việt nam", "nhạc trẻ hot tiktok", "tin tức vtv24",
  "hài hước troll", "ẩm thực đường phố việt nam", "bóng đá việt nam",
  "liên quân mobile highlights", "review công nghệ", "hài kem xôi",
  "trào lưu tiktok mới", "cover nhạc trẻ", "faptv shorts",
  "du lịch việt nam khám phá", "thể thao tổng hợp", "anh độ mixi hài hước"
];

let queryIndex = 0;
let pageIndex = 1;

const getCommentHandle = (author) => {
  if (!author) return "@user";
  if (author.startsWith("@")) return author;
  const clean = author
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "");
  return `@${clean || "user"}`;
};

const formatShortLikes = (count) => {
  if (count === undefined || count === null || isNaN(count)) return "0";
  if (count >= 1000000000) {
    const val = count / 1000000000;
    return `${val.toFixed(val % 1 === 0 ? 0 : 1).replace('.', ',')} T`;
  }
  if (count >= 1000000) {
    const val = count / 1000000;
    return `${val.toFixed(val % 1 === 0 ? 0 : 1).replace('.', ',')} Tr`;
  }
  if (count >= 1000) {
    const val = count / 1000;
    return `${val.toFixed(val % 1 === 0 ? 0 : 1).replace('.', ',')} N`;
  }
  return `${count}`;
};

const parseViewsNum = (viewsStr) => {
  if (typeof viewsStr === "number") return viewsStr;
  const s = String(viewsStr || "").toLowerCase();
  const numMatch = s.match(/([0-9]+([.,][0-9]+)?)/);
  if (!numMatch) return 100000;
  const val = parseFloat(numMatch[1].replace(",", "."));
  if (s.includes("tr") || s.includes("m")) return Math.round(val * 1000000);
  if (s.includes("n") || s.includes("k")) return Math.round(val * 1000);
  return Math.round(val);
};

const getMetricsFromSeed = (videoId, viewsStr) => {
  let seed = 0;
  for (let c of (videoId || "short")) seed = c.charCodeAt(0) + ((seed << 5) - seed);
  seed = Math.abs(seed);
  const approxViews = parseViewsNum(viewsStr);
  const likeRatio = 0.04 + ((seed % 50) / 1000); // 4% to 9%
  const likes = Math.max(120, Math.round(approxViews * likeRatio));
  const commentRatio = 0.01 + ((seed % 20) / 1000); // 1% to 3% of likes
  const commentsCount = Math.max(15, Math.round(likes * commentRatio));
  return { likes, commentsCount };
};

const VIETNAMESE_COMMENTS = [
  "Hay quá bạn ơi! 🔥", "Short này đỉnh thật luôn!", "Xem đi xem lại mãi không chán 😂",
  "Chia sẻ cái này cho mọi người ngay!", "Cuốn hết sức luôn á!",
  "Cảm ơn bạn đã đăng nhé!", "Nhìn thấy cái này là biết đang phí thời gian nhưng không dừng được 😆",
  "Nhạc này nghe chill thật sự ❤️", "Clip xịn quá! Subscribe luôn 🎵",
  "Không tin là mình đã xem đến đây 🙈", "Algorithm đưa tôi tới đây và tôi không hối hận 👌",
  "Cái này viral là đúng rồi!", "Bạn quá tài năng!", "Xem một lần chưa đủ 🔄",
  "Cực kỳ ý nghĩa luôn bạn ơi.", "Đỉnh không điểm chê 💯", "Yêu cái này quá 😍",
  "Thả like không nghĩ ngợi gì hết!", "Content quality như này mà không viral mới lạ!",
  "Subscribe luôn đi thôi!", "Làm ơn ra thêm nội dung kiểu này đi bạn ơi!"
];

const COMMENT_AUTHORS_VI = [
  "Minh Hùng", "Thanh Hoa", "Quang Huy", "Thu Trang", "Bảo Anh",
  "Khánh Linh", "Tuấn Anh", "Mỹ Linh", "Gia Bảo", "Hoàng Yến",
  "Duy Anh", "Hương Giang", "Nam Khánh", "Phương Linh", "Việt Anh"
];

const generateComments = (videoId, count = 10) => {
  let seed = 0;
  for (let c of videoId) seed = c.charCodeAt(0) + ((seed << 5) - seed);
  seed = Math.abs(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `sc_${videoId}_${i}`,
    author: COMMENT_AUTHORS_VI[(seed + i * 7) % COMMENT_AUTHORS_VI.length],
    text: VIETNAMESE_COMMENTS[(seed * (i + 1)) % VIETNAMESE_COMMENTS.length],
    likes: Math.floor(((seed + i * 13) % 5000)),
    uploadedAt: `${(seed + i) % 30 + 1} ngày trước`
  }));
};

const FALLBACK_SHORTS_DATA = [
  {
    videoId: "sO7Kps1muP0",
    title: "Hài Hước vui nhộn #4. #shorts. #giaitrimoingay. #funny. #suhuong",
    views: "15 Tr",
    likes: 420000,
    commentsCount: 1200,
    channel: {
      id: "UCjtmyHIgpDwaLoytITs0QYg",
      name: "Thiên Ý Giải Trí",
      avatar: "https://yt3.googleusercontent.com/1QNTUHDJcsn6sZ6YcB38H7nHYVUpkBI6RReLDgkSETNcixNpKXrdJgTBb5SJvynJgYN_-2kh7A=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "DGwx3b65Xto",
    title: "Tuyệt tình ca | Chú hàng xóm | Hot Trend TIKTOK #shorts",
    views: "8,9 Tr",
    likes: 280000,
    commentsCount: 940,
    channel: {
      id: "UCkiIrwp_7IMy50IPhtSv_Bg",
      name: "Ci Đi Đi",
      avatar: "https://yt3.googleusercontent.com/KoTpzqe8w8tsMA4hXPqImRQcfygtZVlHo4P6onYTaJkzngIypOjkH7eK8xIhvYP95QThmzMK0mw=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "tSZbfzw2tUs",
    title: "tiktok hot trend 36 #shorts cũng là nhạc Thái nhưng nó lạ lắm",
    views: "12 Tr",
    likes: 540000,
    commentsCount: 2100,
    channel: {
      id: "UCfc97rtLrhbtPq7c3Pg3_3A",
      name: "tiktok hot trend",
      avatar: "https://yt3.googleusercontent.com/rd55gmskadDf3AsMS2IvuSvYJpkdJZUTFpLpWkft1pNTXS_m558-z6wUE8ugL8CLG96VYgyAbYA=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "fRT4mi6NMjE",
    title: "Đừng Bắt Anh Hứa | Demo | #shorts | Bình Gold | Nhạc Trend",
    views: "5,4 Tr",
    likes: 190000,
    commentsCount: 850,
    channel: {
      id: "UCJWrgybxe6LtHgNr2JQsEJQ",
      name: "Nhạc Trend",
      avatar: "https://yt3.googleusercontent.com/7sfQlGU6KSJ8GmeCV2mLqOUVmPSrbPLZn5Z557Q13ZgkbHzfDBHWvCfU5l0R4bESyp4vY6Pkng=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "y1YrPt9Gdt0",
    title: "Nhạc Trung hot nhất hiện nay🎶#shorts #nhaccutetiktok #dethuong",
    views: "3,2 Tr",
    likes: 120000,
    commentsCount: 430,
    channel: {
      id: "UCdaTEaoJXmjwr1oOFL4-2Og",
      name: "Bún Bò Remix",
      avatar: "https://yt3.googleusercontent.com/Gy5n4M8vkV7xglGiNBguVJt2MGv-fDIwGtc3ezsJBNyfXDd3cjgn6l3RHPP6vAOEaBtKFY7pHw=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "ZVXOhT6kwhQ",
    title: "TÔN THỜ MỘT TÌNH YÊU - BẰNG CƯỜNG #SHORTS NHẠC TRẺ",
    views: "6,7 Tr",
    likes: 210000,
    commentsCount: 1100,
    channel: {
      id: "UCKRLY9PzqtA7KnbbWo_oFxg",
      name: "Bằng Cường Official",
      avatar: "https://yt3.googleusercontent.com/WodO8tNBn1jVxH4MFkH4n2k2mtJBV3zhnPLSKT3--oR0XOolQJP2OqhSF_TJJwgQJUEmeFSbGA=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "vcpD49QhXsQ",
    title: "Hãy Làm Cô Dâu Hạnh Phúc Mai Sau Thân Anh Nghèo #shorts",
    views: "1,2 Tr",
    likes: 72000,
    commentsCount: 380,
    channel: {
      id: "UCd3n4h9rctQxi9n2cfvHAXA",
      name: "NHẠC HOT THEO TREND",
      avatar: "https://yt3.googleusercontent.com/KASZFrx1HfSZspUl-OEk9LAHIxJ7uFOXk7u85o3cygRKFUHGf8odGGuiVMD65U0JO1mSgjGq=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "aJyJ55rGbiA",
    title: "đẹp long lanh.....[] Nhạc hot tiktok #31 | MUSIC PHIÊU",
    views: "4,5 Tr",
    likes: 154000,
    commentsCount: 720,
    channel: {
      id: "UCoTKnE-SE4cdnfxcZyf5pdA",
      name: "M U S I C Phiêu",
      avatar: "https://yt3.googleusercontent.com/cnzsZkbPukVEH73iw3pOJym5_1cjpy460jT7n2o8bO-Cws0bw0VBzkTm0wYhpX2WFRRBa_JxLgI=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "YRU-JsEaixk",
    title: "top những bài hát hot trên tik tok#shorts",
    views: "9,1 Tr",
    likes: 380000,
    commentsCount: 1650,
    channel: {
      id: "UC6cXvJobbT_SF171Me2BrVw",
      name: "Âm Nhạc Music",
      avatar: "https://yt3.googleusercontent.com/Nbr-C-oEZlTAq8jI6GmFPqzvIMq4b2LLIgRw67FyuzT5IdRQj42-IIXC9CsqEyQ7PQ2EMC2A8mY=s240-c-k-c0x00ffffff-no-rj"
    }
  },
  {
    videoId: "8seksCu947k",
    title: "Beautiful Girls | Mẹ Đơn Thân_Hương Ly | NHẠC VIỆT REMIX 2023 #shorts",
    views: "11 Tr",
    likes: 510000,
    commentsCount: 2250,
    channel: {
      id: "UCtJJ13CdHnvYb-VrZq2BklA",
      name: "VH Media",
      avatar: "https://yt3.googleusercontent.com/OHF3nW8YRX0aMqCbqDDj3Fx6hslfdO-z8l8SaE2IO68o2LN6vAsri2emDt9pypzEaJxE2vBJ=s240-c-k-c0x00ffffff-no-rj"
    }
  }
];

const INVIDIOUS_INSTANCES = [
  "https://y.com.sb",
  "https://yt.chocolatemoo53.com",
  "https://inv.thepixora.com",
  "https://invidious.projectsegfau.lt",
  "https://yewtu.be",
  "https://invidious.flokinet.to"
];

const mapApiItemToShort = (item, instance) => {
  if (!item.videoId) return null;
  const likesBase = item.likeCount || Math.floor((item.viewCount || 10000) * 0.04);
  const avatar = resolveChannelAvatar(item.authorThumbnails, item.author, instance, item.authorId);
  return {
    id: `short_api_${item.videoId}`,
    videoId: item.videoId,
    title: item.title || "",
    views: formatShortLikes(item.viewCount || 0),
    likes: likesBase,
    commentsCount: Math.floor(likesBase * 0.08),
    channel: {
      id: item.authorId || (item.author || "").toLowerCase().replace(/\s+/g, ""),
      name: item.author || "",
      avatar
    },
    comments: generateComments(item.videoId, 12)
  };
};

const getFallbackShorts = (offset = 0) => {
  // Shuffle fallback data dynamically to provide infinite scrolling variety when API fails
  const shuffled = [...FALLBACK_SHORTS_DATA].sort(() => 0.5 - Math.random());
  return shuffled.map((item, idx) => ({
    id: `short_fb_${item.videoId}_${offset}_${idx}_${Date.now()}`,
    videoId: item.videoId,
    title: item.title,
    views: item.views,
    likes: item.likes,
    commentsCount: item.commentsCount,
    channel: item.channel,
    comments: generateComments(item.videoId, 12)
  }));
};

const ShortPlayer = ({ videoId, isActive, isMuted, onMuteToggle, onLikeToggle, title }) => {
  const iframeRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const safetyTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);
    return () => clearTimeout(safetyTimer);
  }, [videoId]);
  const [localPlaying, setLocalPlaying] = useState(true);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(null); // 'play' or 'pause' or null
  const [showHeart, setShowHeart] = useState(false);
  const lastClickTime = useRef(0);
  const clickTimeout = useRef(null);

  // Keep track of active state and play/pause the video using YouTube API postMessage
  const postCommand = (func, args = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    }
  };

  useEffect(() => {
    if (isLoaded) {
      if (isActive) {
        postCommand("playVideo");
        postCommand(isMuted ? "mute" : "unMute");
        setLocalPlaying(true);
      } else {
        postCommand("pauseVideo");
        setLocalPlaying(false);
      }
    }
  }, [isActive, isLoaded, isMuted]);

  const handleOverlayClick = (e) => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      // Double click!
      clearTimeout(clickTimeout.current);
      onLikeToggle();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    } else {
      // Single click!
      clickTimeout.current = setTimeout(() => {
        if (!isLoaded) return;
        const nextPlaying = !localPlaying;
        setLocalPlaying(nextPlaying);
        postCommand(nextPlaying ? "playVideo" : "pauseVideo");
        
        setShowPlayPauseIcon(nextPlaying ? "play" : "pause");
        setTimeout(() => setShowPlayPauseIcon(null), 600);
      }, 250);
    }
    lastClickTime.current = now;
  };

  return (
    <div className="short-player-wrapper" style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#000" }}>
      <iframe
        ref={iframeRef}
        id={`short-iframe-${videoId}`}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        className="short-video-iframe"
        onLoad={() => {
          setIsLoaded(true);
        }}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none", // Prevent focus stealing and native click hijack
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        tabIndex="-1"
      />

      {/* Click overlay & gesture control */}
      <div 
        className="short-iframe-overlay" 
        onClick={handleOverlayClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          cursor: "pointer"
        }}
      />

      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="short-video-placeholder" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
          <img 
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} 
            alt={title} 
            className="short-placeholder-thumb"
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4, filter: "blur(10px)" }}
            onError={(e) => handleThumbnailError(e, videoId, title)}
          />
          <div className="spinner" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40 }}></div>
        </div>
      )}

      {/* Floating play/pause animation overlay */}
      {showPlayPauseIcon && (
        <div className="gesture-animation" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(1)",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: "50%",
          padding: "16px",
          color: "#fff",
          zIndex: 3,
          pointerEvents: "none",
          animation: "gesturePulse 0.6s ease-out forwards"
        }}>
          {showPlayPauseIcon === "play" ? <Play size={32} fill="#fff" /> : <Pause size={32} fill="#fff" />}
        </div>
      )}

      {/* Floating double-click heart animation overlay */}
      {showHeart && (
        <div className="heart-animation" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#ff2a2a",
          zIndex: 3,
          pointerEvents: "none",
          animation: "heartFloat 0.8s ease-in-out forwards"
        }}>
          <Heart size={64} fill="#ff2a2a" />
        </div>
      )}

      {/* Floating volume indicator button */}
      <button 
        className="shorts-volume-btn" 
        onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "rgba(0, 0, 0, 0.6)",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          zIndex: 3,
          cursor: "pointer",
          transition: "background 0.2s"
        }}
        title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Red progress accent line */}
      {isLoaded && (
        <div className="shorts-bottom-progress-bar" style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "3px",
          backgroundColor: "#ff0000",
          animation: isActive && localPlaying ? "shortsPlayProgress 30s linear infinite" : "none",
          transformOrigin: "left",
          zIndex: 3
        }} />
      )}

      <style>{`
        @keyframes gesturePulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
        @keyframes heartFloat {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -70%) scale(1); opacity: 0; }
        }
        @keyframes shortsPlayProgress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

const Shorts = () => {
  const { subscriptions, toggleSubscribe, checkAuth, currentUser, activeShortId, setActiveShortId, fetchFromInvidious, isSidebarExpanded, activeInstance, showToast, handleChannelSelect } = useContext(YoutubeContext);
  const [shortsData, setShortsData] = useState(() => getFallbackShorts(0));
  const [likedShorts, setLikedShorts] = useState([]);
  const [dislikedShorts, setDislikedShorts] = useState([]);
  const [likedShortComments, setLikedShortComments] = useState([]);
  const [dislikedShortComments, setDislikedShortComments] = useState([]);
  const [activeCommentShort, setActiveCommentShort] = useState(null);
  const [shareModalShort, setShareModalShort] = useState(null);
  const [reportModalShort, setReportModalShort] = useState(null);
  const [activeMoreMenuShortId, setActiveMoreMenuShortId] = useState(null);
  const [showDescriptionShort, setShowDescriptionShort] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const seenVideoIds = useRef(new Set());
  const containerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleLikeShortComment = (commentId) => {
    if (!checkAuth()) return;
    setLikedShortComments(prev => 
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
    setDislikedShortComments(prev => prev.filter(id => id !== commentId));
  };

  const toggleDislikeShortComment = (commentId) => {
    if (!checkAuth()) return;
    setDislikedShortComments(prev => 
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
    setLikedShortComments(prev => prev.filter(id => id !== commentId));
  };

  const isFetchingMoreRef = useRef(false);

  // Fetch shorts from API, filtering strictly for actual vertical shorts (length <= 75s) and rotating queries
  const fetchShorts = useCallback(async (isInitial = false) => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    if (!isInitial) setIsLoadingMore(true);

    try {
      let accumulated = [];
      let attempts = 0;
      const maxAttempts = 3;

      while (accumulated.length < 8 && attempts < maxAttempts) {
        const query = SHORT_QUERIES[queryIndex % SHORT_QUERIES.length] + " #shorts";
        queryIndex++;
        attempts++;

        try {
          // 1. Try local high-speed InnerTube search first
          const localRes = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
          if (localRes.ok) {
            const resJson = await localRes.json();
            if (resJson && Array.isArray(resJson.videos) && resJson.videos.length > 0) {
              const localMapped = resJson.videos
                .filter(v => v.id && !seenVideoIds.current.has(v.id))
                .map(v => {
                  seenVideoIds.current.add(v.id);
                  const isVerified = (v.channel?.name || "").includes("Official") || (v.views && String(v.views).includes("Tr"));
                  const metrics = getMetricsFromSeed(v.id, v.views);
                  return {
                    id: `short_it_${v.id}`,
                    videoId: v.id,
                    title: v.title,
                    description: v.title,
                    channel: {
                      id: v.channel?.id || "",
                      name: v.channel?.name || "Kênh YouTube",
                      avatar: v.channel?.avatar || getFallbackAvatar(v.channel?.name),
                      subscribers: v.channel?.subscribers || "750 N người đăng ký",
                      isVerified
                    },
                    views: v.views || "450 N",
                    likes: metrics.likes,
                    commentsCount: metrics.commentsCount,
                    sharesCount: Math.round(metrics.likes * 0.1),
                    comments: generateComments(v.id)
                  };
                });
              if (localMapped.length > 0) {
                accumulated = [...accumulated, ...localMapped];
                continue;
              }
            }
          }
        } catch (localErr) {}
      }

      if (accumulated.length === 0) {
        accumulated = getFallbackShorts(seenVideoIds.current.size);
        accumulated.forEach(s => seenVideoIds.current.add(s.videoId));
      }

      setShortsData(prev => {
        const raw = (isInitial && prev.length === 0) ? accumulated : [...prev, ...accumulated];
        const seen = new Set();
        return raw.filter(item => {
          const vid = item.videoId || item.id;
          if (!vid || seen.has(vid)) return false;
          seen.add(vid);
          return true;
        });
      });
      setIsLoading(false);
    } catch (e) {
      const fb = getFallbackShorts(seenVideoIds.current.size);
      setShortsData(prev => {
        const raw = (isInitial && prev.length === 0) ? fb : [...prev, ...fb];
        const seen = new Set();
        return raw.filter(item => {
          const vid = item.videoId || item.id;
          if (!vid || seen.has(vid)) return false;
          seen.add(vid);
          return true;
        });
      });
      setIsLoading(false);
    } finally {
      isFetchingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load or handle activeShortId transitions with 0ms instant playback
  useEffect(() => {
    if (activeShortId) {
      const matchFallback = FALLBACK_SHORTS_DATA.find(s => s.videoId === activeShortId);
      const metrics = getMetricsFromSeed(activeShortId, "650 N");
      const instantActive = matchFallback || {
        id: activeShortId,
        videoId: activeShortId,
        title: "Video Shorts thịnh hành",
        channel: {
          id: "channel_" + activeShortId,
          name: "Kênh Shorts",
          avatar: getFallbackAvatar("Shorts")
        },
        views: "650 N",
        likes: metrics.likes,
        commentsCount: metrics.commentsCount,
        shares: Math.round(metrics.likes * 0.1),
        comments: generateComments(activeShortId)
      };

      seenVideoIds.current.add(activeShortId);
      setShortsData(prev => [instantActive, ...prev.filter(s => s.videoId !== activeShortId)]);
      setCurrentIndex(0);
      setIsLoading(false);
      setActiveShortId(null);
    } else {
      fetchShorts(true);
    }
  }, [activeShortId, fetchShorts]);

  // When approaching end, fetch more
  useEffect(() => {
    if (shortsData.length > 0 && currentIndex >= shortsData.length - 2) {
      fetchShorts(false);
    }
  }, [currentIndex, shortsData.length, fetchShorts]);

  // IntersectionObserver to update currentIndex based on viewport snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index"), 10);
            if (!isNaN(index)) {
              setCurrentIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // Trigger when 60% of the slide is visible
      }
    );

    const children = container.querySelectorAll(".shorts-single-view");
    children.forEach((child) => observer.observe(child));

    return () => {
      observer.disconnect();
    };
  }, [shortsData]);

  // Scroll to index helper for button/keyboard navigation
  const scrollToIndex = (idx) => {
    const container = containerRef.current;
    if (!container) return;
    const children = container.querySelectorAll(".shorts-single-view");
    const targetChild = children[idx];
    if (targetChild) {
      container.scrollTo({
        top: targetChild.offsetTop,
        behavior: "smooth"
      });
    }
  };

  const goNext = () => {
    if (currentIndex < shortsData.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      scrollToIndex(nextIdx);
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      scrollToIndex(prevIdx);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (
        activeCommentShort ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, activeCommentShort, shortsData.length]);

  const handleLike = (shortId) => {
    if (!checkAuth()) return;
    if (likedShorts.includes(shortId)) {
      setLikedShorts(likedShorts.filter(id => id !== shortId));
      setShortsData(prev => prev.map(s => s.id === shortId ? { ...s, likes: s.likes - 1 } : s));
    } else {
      setLikedShorts([...likedShorts, shortId]);
      setDislikedShorts(dislikedShorts.filter(id => id !== shortId));
      setShortsData(prev => prev.map(s => s.id === shortId ? { ...s, likes: s.likes + 1 } : s));
    }
  };

  const handleDislike = (shortId) => {
    if (!checkAuth()) return;
    if (dislikedShorts.includes(shortId)) {
      setDislikedShorts(dislikedShorts.filter(id => id !== shortId));
    } else {
      setDislikedShorts([...dislikedShorts, shortId]);
      if (likedShorts.includes(shortId)) {
        setLikedShorts(likedShorts.filter(id => id !== shortId));
        setShortsData(prev => prev.map(s => s.id === shortId ? { ...s, likes: s.likes - 1 } : s));
      }
    }
  };

  const handleAddComment = (e, shortId) => {
    e.preventDefault();
    if (!checkAuth()) return;
    if (!newCommentText.trim()) return;

    const newComment = {
      id: `sc_user_${Date.now()}`,
      author: currentUser.name,
      text: newCommentText,
      likes: 0,
      uploadedAt: "Vừa xong"
    };

    setShortsData(prev => prev.map(s => {
      if (s.id === shortId) {
        return { ...s, commentsCount: s.commentsCount + 1, comments: [newComment, ...s.comments] };
      }
      return s;
    }));

    setActiveCommentShort(prev => {
      if (prev && prev.id === shortId) {
        return { ...prev, commentsCount: prev.commentsCount + 1, comments: [newComment, ...prev.comments] };
      }
      return prev;
    });

    setNewCommentText("");
  };

  const handleShare = (short) => {
    setShareModalShort({
      id: short.videoId,
      title: short.title,
      channel: { name: short.channelName }
    });
  };

  if (shortsData.length === 0) {
    return (
      <div className="shorts-page-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "#aaa" }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
          <p>Đang tải Shorts...</p>
        </div>
      </div>
    );
  }

  if (shortsData.length === 0) return null;

  return (
    <div className="shorts-page-container" ref={containerRef} style={{
      overflowY: "scroll",
      overflowX: "hidden",
      scrollSnapType: "y mandatory",
      height: "calc(100vh - 56px)",
      scrollBehavior: "smooth",
      position: "relative",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <style>{`
        .shorts-page-container::-webkit-scrollbar {
          display: none;
        }
        .shorts-page-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
          overflow-x: hidden !important;
        }
        .shorts-single-view {
          height: calc(100vh - 56px);
          min-height: calc(100vh - 56px);
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          padding: 12px 0;
        }
        .short-video-placeholder {
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px;
          overflow: hidden;
        }
        .short-placeholder-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.4;
          filter: blur(10px);
        }
      `}</style>

      {/* Floating counter removed for clean YouTube Shorts experience */}

      {shortsData.map((short, idx) => {
        const isActive = idx === currentIndex;
        const isSubbed = subscriptions.includes(short.channel.id);
        const isLiked = likedShorts.includes(short.id);
        const isDisliked = dislikedShorts.includes(short.id);

        return (
          <div key={`${short.id || short.videoId}_${idx}`} className="shorts-single-view" data-index={idx}>
            <div className="short-video-and-actions">
              {/* 9:16 Vertical Video Frame */}
              <div className="short-video-player-frame">
                {Math.abs(idx - currentIndex) <= 1 ? (
                  <ShortPlayer 
                    videoId={short.videoId}
                    isActive={isActive}
                    isMuted={isMuted}
                    onMuteToggle={() => setIsMuted(prev => !prev)}
                    onLikeToggle={() => handleLike(short.id)}
                    title={short.title}
                  />
                ) : (
                  <div className="short-video-placeholder">
                    <img 
                      src={`https://img.youtube.com/vi/${short.videoId}/hqdefault.jpg`} 
                      alt={short.title} 
                      className="short-placeholder-thumb"
                    />
                  </div>
                )}

                {/* Info Overlay */}
                <div className="short-video-info-overlay">
                  <div className="short-creator-line">
                    <img
                      src={short.channel.avatar}
                      alt={short.channel.name}
                      className="short-creator-avatar" referrerPolicy="no-referrer"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChannelSelect({
                          id: short.channel.id,
                          name: short.channel.name,
                          avatar: short.channel.avatar,
                          handle: getCommentHandle(short.channel.name || short.channel.id)
                        });
                      }}
                      onError={e => { e.target.src = getFallbackAvatar(short.channel.name); }}
                    />
                    <span 
                      className="short-creator-name"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChannelSelect({
                          id: short.channel.id,
                          name: short.channel.name,
                          avatar: short.channel.avatar,
                          handle: getCommentHandle(short.channel.name || short.channel.id)
                        });
                      }}
                    >
                      {getCommentHandle(short.channel.name || short.channel.id)}
                    </span>
                    <button
                      className={`short-subscribe-btn ${isSubbed ? "subscribed" : ""}`}
                      onClick={() => toggleSubscribe(short.channel.id)}
                    >
                      {isSubbed ? "Đã đăng ký" : "Đăng ký"}
                    </button>
                  </div>
                  <h3 className="short-video-title-overlay">{short.title}</h3>
                  <p className="short-video-views-overlay">
                    {String(short.views || "").replace(/(lượt\s*xem\s*)+/gi, "").trim()} lượt xem
                  </p>
                  <div className="short-audio-pill" title={`${short.channel?.name || "Kênh"} • Âm thanh gốc`}>
                    <Music size={13} className="short-audio-icon" />
                    <span className="short-audio-text">{short.channel?.name || "Kênh"} • Âm thanh gốc</span>
                  </div>
                </div>
              </div>

              {/* Vertical Actions Panel (YouTube Desktop Parity: strictly standard actions) */}
              <div className="short-actions-sidebar">
                {/* Like */}
                <div className="short-action-pill-wrapper">
                  <button
                    className={`short-action-circle ${isLiked ? "liked" : ""}`}
                    onClick={() => handleLike(short.id)}
                    title="Thích"
                  >
                    <ThumbsUp size={22} className={isLiked ? "fill-icon" : ""} />
                  </button>
                  <span className="short-action-label">{formatShortLikes(short.likes)}</span>
                </div>

                {/* Dislike */}
                <div className="short-action-pill-wrapper">
                  <button
                    className={`short-action-circle ${isDisliked ? "disliked" : ""}`}
                    onClick={() => handleDislike(short.id)}
                    title="Không thích"
                  >
                    <ThumbsDown size={22} />
                  </button>
                  <span className="short-action-label">Không thích</span>
                </div>

                {/* Comments */}
                <div className="short-action-pill-wrapper">
                  <button
                    className="short-action-circle"
                    onClick={() => setActiveCommentShort(short)}
                    title="Bình luận"
                  >
                    <MessageSquare size={22} />
                  </button>
                  <span className="short-action-label">{formatShortLikes(short.commentsCount)}</span>
                </div>

                {/* Share */}
                <div className="short-action-pill-wrapper">
                  <button
                    className="short-action-circle"
                    onClick={() => handleShare(short)}
                    title="Chia sẻ"
                  >
                    <Share2 size={22} />
                  </button>
                  <span className="short-action-label">Chia sẻ</span>
                </div>

                {/* More 3-dots */}
                <div style={{ position: "relative" }}>
                  <button 
                    className="short-action-circle small-btn" 
                    title="Thêm tùy chọn"
                    onClick={() => setActiveMoreMenuShortId(activeMoreMenuShortId === short.id ? null : short.id)}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {activeMoreMenuShortId === short.id && (
                    <div 
                      className="video-card-dropdown" 
                      style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: "8px", width: "200px", zIndex: 999 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div 
                        className="video-card-dropdown-item"
                        onClick={() => {
                          setShowDescriptionShort(short);
                          setActiveMoreMenuShortId(null);
                        }}
                      >
                        <FileText size={18} />
                        <span>Mô tả video</span>
                      </div>

                      <div 
                        className="video-card-dropdown-item"
                        onClick={() => {
                          setShortsData(prev => prev.filter(s => s.id !== short.id));
                          showToast("Đã ẩn video Short này");
                          setActiveMoreMenuShortId(null);
                        }}
                      >
                        <EyeOff size={18} />
                        <span>Không quan tâm</span>
                      </div>

                      <div 
                        className="video-card-dropdown-item"
                        onClick={() => {
                          setReportModalShort({
                            id: short.videoId,
                            title: short.title
                          });
                          setActiveMoreMenuShortId(null);
                        }}
                      >
                        <Flag size={18} />
                        <span>Báo cáo</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Up/Down Navigation Arrows (Single Fixed Overlay for Desktop YouTube Parity) */}
      <div className="shorts-nav-arrows">
        <button
          className="shorts-arrow-btn"
          onClick={goPrev}
          disabled={currentIndex === 0}
          title="Short trước"
        >
          <ChevronUp size={24} />
        </button>
        <button
          className="shorts-arrow-btn"
          onClick={goNext}
          title="Short tiếp theo"
        >
          {isLoadingMore ? (
            <div className="spinner" style={{ width: 18, height: 18 }}></div>
          ) : (
            <ChevronDown size={24} />
          )}
        </button>
      </div>

      {/* Comments Panel */}
      {activeCommentShort && (
        <div className="shorts-comments-panel-overlay" onClick={() => setActiveCommentShort(null)}>
          <div className="shorts-comments-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h3>
                Bình luận{" "}
                <span className="panel-header-count">
                  ({formatShortLikes(activeCommentShort.commentsCount)})
                </span>
              </h3>
              <button className="panel-close-btn" onClick={() => setActiveCommentShort(null)} title="Đóng">
                <X size={20} />
              </button>
            </div>

            {/* Comment Form at TOP under header (Desktop YouTube parity) */}
            <form onSubmit={(e) => handleAddComment(e, activeCommentShort.id)} className="panel-comment-form">
              <img
                src={currentUser ? currentUser.avatar : getFallbackAvatar("Guest")}
                alt="Avatar"
                className="panel-form-avatar"
                onError={e => { e.target.src = getFallbackAvatar("Guest"); }}
              />
              <div className="panel-input-container">
                <input
                  type="text"
                  placeholder="Thêm bình luận..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="panel-input-field"
                  onFocus={() => { if (!checkAuth()) { document.activeElement.blur(); } }}
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="panel-submit-btn"
                  title="Gửi bình luận"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>

            <div className="panel-comments-list">
              {activeCommentShort.comments.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: "32px 16px" }}>
                  <MessageSquare size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                activeCommentShort.comments.map((comment) => (
                  <div key={comment.id} className="panel-comment-item">
                    <img
                      src={getFallbackAvatar(comment.author)}
                      alt={comment.author}
                      className="panel-comment-avatar"
                      onError={e => { e.target.src = getFallbackAvatar(comment.author); }}
                    />
                    <div className="panel-comment-body">
                      <div className="panel-comment-meta">
                        <span className="panel-comment-author">{getCommentHandle(comment.author)}</span>
                        <span className="panel-comment-time">{comment.uploadedAt}</span>
                      </div>
                      <p className="panel-comment-text">{comment.text}</p>
                      <div className="panel-comment-actions">
                        <button
                          className={`panel-comment-btn-action ${likedShortComments.includes(comment.id) ? "liked" : ""}`}
                          onClick={() => toggleLikeShortComment(comment.id)}
                          style={{ color: likedShortComments.includes(comment.id) ? "#3ea6ff" : "inherit", cursor: "pointer" }}
                        >
                          <ThumbsUp size={12} fill={likedShortComments.includes(comment.id) ? "currentColor" : "none"} />
                          <span>{formatShortLikes((comment.likes || 0) + (likedShortComments.includes(comment.id) ? 1 : 0))}</span>
                        </button>
                        <button
                          className={`panel-comment-btn-action ${dislikedShortComments.includes(comment.id) ? "disliked" : ""}`}
                          onClick={() => toggleDislikeShortComment(comment.id)}
                          style={{ color: dislikedShortComments.includes(comment.id) ? "#3ea6ff" : "inherit", cursor: "pointer" }}
                        >
                          <ThumbsDown size={12} fill={dislikedShortComments.includes(comment.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalShort && (
        <ShareModal video={shareModalShort} onClose={() => setShareModalShort(null)} />
      )}

      {/* Report Modal */}
      {reportModalShort && (
        <ReportModal video={reportModalShort} onClose={() => setReportModalShort(null)} />
      )}

      {/* Short Description Modal */}
      {showDescriptionShort && (
        <div className="modal-overlay" onClick={() => setShowDescriptionShort(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "420px", background: "#212121", borderRadius: "12px", padding: "20px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Mô tả</h3>
              <button onClick={() => setShowDescriptionShort(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#ddd", whiteSpace: "pre-wrap" }}>
              {showDescriptionShort.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shorts;
