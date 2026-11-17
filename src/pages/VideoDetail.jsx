import React, { useContext, useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal, Sparkles, Bookmark, ListFilter, Settings, Volume2, MessageSquare, Gauge, Settings2, Moon, Mic, ChevronDown, ChevronUp, Maximize2, Play, Pause, X, SkipForward, ListPlus, Flag, Keyboard } from "lucide-react";
import { YoutubeContext, getFallbackAvatar, resolveChannelMetaFromVideo, handleThumbnailError, formatViewsVi, formatSubsVi, KNOWN_CHANNEL_SUBS, translateDateVi } from "../context/YoutubeContext";
import { ShareModal, PlaylistModal, ReportModal, KeyboardShortcutsModal } from "../components/Modals";
import "./pages.css";

const getHashtags = (desc, title) => {
  // Use Unicode property escapes so Vietnamese tags like #TrảiNghiệmGame aren't truncated to #Tr
  const matches = desc ? desc.match(/#[\p{L}\p{N}_]+/gu)?.filter(tag => tag.length >= 3) : null;
  if (matches && matches.length > 0) return matches.slice(0, 3).join(" ");
  const t = (title || "").toLowerCase();
  if (t.includes("vtv24") || t.includes("thời sự") || t.includes("tin tức")) return "#TinTuc #ThoiSu #VTV24";
  if (t.includes("nhạc") || t.includes("lofi") || t.includes("sing") || t.includes("song") || t.includes("mv")) return "#AmNhac #NhacTre #Trending";
  if (t.includes("game") || t.includes("free fire") || t.includes("liên quân") || t.includes("tng") || t.includes("aog")) return "#TroChoi #Gaming #LienQuan";
  return "#Trending #VietNam #VideoMoiNhat";
};

const RelatedVideoSkeleton = () => (
  <div className="related-video-card skeleton">
    <div className="related-thumbnail-container skeleton-box"></div>
    <div className="related-info" style={{ gap: "6px", flex: 1 }}>
      <div className="skeleton-box text-line-title" style={{ height: "14px", width: "90%" }}></div>
      <div className="skeleton-box text-line-channel" style={{ height: "10px", width: "50%" }}></div>
    </div>
  </div>
);

const CommentSkeleton = () => (
  <div className="comment-item skeleton" style={{ gap: "12px" }}>
    <div className="comment-avatar skeleton-box circle"></div>
    <div className="comment-content" style={{ gap: "6px", flex: 1 }}>
      <div className="skeleton-box" style={{ height: "12px", width: "120px", borderRadius: "4px" }}></div>
      <div className="skeleton-box" style={{ height: "12px", width: "95%", borderRadius: "4px" }}></div>
    </div>
  </div>
);

const VerifiedBadge = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "4px", color: "#aaa" }} title="Đã xác minh">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const getCommentHandle = (author) => {
  if (!author) return "@user";
  if (author.startsWith("@")) return author;
  const clean = author.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "");
  return `@${clean || "user"}`;
};

const formatCommentLikes = (count) => {
  if (count === undefined || count === null) return "";
  const num = parseInt(count, 10);
  if (isNaN(num) || num === 0) return "";
  if (num >= 1000) {
    const val = num / 1000;
    return `${val.toFixed(val % 1 === 0 ? 0 : 1).replace('.', ',')} N`;
  }
  return `${num}`;
};

const VIETNAMESE_REPLY_TEMPLATES = [
  "Đúng vậy luôn á bạn, nghe cuốn thực sự!", "Mình cũng thấy y hệt như bạn vậy, quá đỉnh luôn.",
  "Chuẩn luôn, không lệch đi đâu được.", "Nghiện bài này mất rồi, ngày nào cũng lặp đi lặp lại.",
  "Tuyệt vời quá anh ơi! Mong ra thêm nhiều video nữa.", "Đồng quan điểm với bạn nha, rất sâu sắc.",
  "Hay quá, cảm ơn bạn đã chia sẻ bình luận này.", "Nghe đi nghe lại không chán luôn á mọi người.",
  "Quá hay luôn ấy chứ, xem cuốn cực kỳ!", "Cực kỳ ý nghĩa luôn bạn ơi."
];
const REPLY_AUTHORS = ["Tuan Anh", "Minh Huy", "Thanh Hang", "Khanh Linh", "Quoc Bao", "Hoang Long", "Mai Phuong", "Duy Manh", "Hai Dang", "Thu Trang"];

const getDeterministicReplies = (commentId, author) => {
  let hash = 0;
  const str = String(commentId) + String(author);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  hash = Math.abs(hash);
  const replyCount = (hash % 4) + 1;
  return Array.from({ length: replyCount }, (_, i) => {
    const authorIdx = (hash + i) % REPLY_AUTHORS.length;
    const textIdx = (hash * (i + 1)) % VIETNAMESE_REPLY_TEMPLATES.length;
    const replyAuthor = REPLY_AUTHORS[authorIdx];
    return {
      id: `reply_${commentId}_${i}`, author: replyAuthor, avatar: getFallbackAvatar(replyAuthor),
      text: VIETNAMESE_REPLY_TEMPLATES[textIdx], uploadedAt: `${(hash + i) % 30 + 1} ngày trước`,
      likes: Math.floor((hash / (i + 1)) % 120)
    };
  });
};

const getDeterministicHeart = (commentId, author) => {
  let hash = 0;
  const str = String(commentId) + String(author);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 3 === 0;
};

// ---- More Options Dropdown ----
const MoreOptionsDropdown = ({ onDownload, onReport, onShortcuts, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);
  return (
    <div ref={ref} className="more-options-dropdown" style={{
      position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#282828",
      borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", minWidth: "200px", zIndex: 99,
      overflow: "hidden", padding: "6px 0", border: "1px solid #3f3f3f"
    }}>
      <button className="more-option-item" onClick={() => { onDownload(); onClose(); }}>
        <Download size={18} /> <span>Tải xuống</span>
      </button>
      <button className="more-option-item" onClick={() => { onReport(); onClose(); }}>
        <Flag size={18} /> <span>Báo cáo</span>
      </button>
      <button className="more-option-item" onClick={() => { onShortcuts(); onClose(); }}>
        <Keyboard size={18} /> <span>Phím tắt</span>
      </button>
    </div>
  );
};

const VideoDetail = () => {
  const {
    activeVideo, setActiveVideo, videos, subscriptions, toggleSubscribe, likedVideos, toggleLike,
    addComment, handleVideoSelect, handleChannelSelect, isDetailsLoading, currentUser,
    checkAuth, watchLater, toggleWatchLater, downloadVideo, isDownloaded, fetchMoreComments, fetchMoreRelatedVideos,
    activeInstance, watchHistory, prefetchVideo, prefetchChannel,
    isMiniplayerActive, setIsMiniplayerActive, lastPlaybackTime, setLastPlaybackTime, navigateTo,
    backgroundPage, activePage, channelAvatars, showToast: contextShowToast,
    activePlaylist, setActivePlaylist, activePlaylistIndex, setActivePlaylistIndex,
    isPlaylistLoop, isPlaylistShuffle, handlePlaylistSelect, playPlaylistItem,
    playNextPlaylistItem, playPrevPlaylistItem, togglePlaylistLoop, togglePlaylistShuffle, closePlaylist
  } = useContext(YoutubeContext);

  // ---- All state hooks FIRST ----
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyInputText, setReplyInputText] = useState("");

  const handleStartReply = (commentId, authorHandle = "") => {
    if (!checkAuth()) return;
    setReplyingCommentId(commentId);
    setReplyInputText(authorHandle ? `@${authorHandle} ` : "");
  };

  const handleSubmitReply = (e, commentId) => {
    e.preventDefault();
    if (!replyInputText.trim()) return;
    const authorName = currentUser?.name || "Bạn";
    const newReply = {
      id: `reply_${Date.now()}`,
      author: authorName,
      avatar: currentUser?.avatar || getFallbackAvatar(authorName),
      text: replyInputText.trim(),
      likes: 0,
      uploadedAt: "Vừa xong"
    };

    setCurrentVideoState(prev => {
      if (!prev) return prev;
      const nextComments = (prev.comments || []).map(c => {
        if (c.id === commentId) {
          const updatedReplies = [...(c.replies || []), newReply];
          return {
            ...c,
            replies: updatedReplies,
            replyCount: (c.replyCount || updatedReplies.length - 1) + 1
          };
        }
        return c;
      });
      return { ...prev, comments: nextComments };
    });

    setExpandedReplies(prev => prev.includes(commentId) ? prev : [...prev, commentId]);
    setReplyingCommentId(null);
    setReplyInputText("");
    showToast("Đã đăng câu trả lời bình luận!");
  };
  const [showCommentActions, setShowCommentActions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isFetchingMoreRelated, setIsFetchingMoreRelated] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOrder, setSortOrder] = useState("top");
  const [playerServer, setPlayerServer] = useState("youtube");
  const [backupPlayerError, setBackupPlayerError] = useState(false);
  const [toast, setToast] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [volume, setVolume] = useState(100);
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(null);

  // Player settings
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState("main");
  const [superResolution, setSuperResolution] = useState(true);
  const [dolbyAtmos, setDolbyAtmos] = useState(true);
  const [stableVolume, setStableVolume] = useState(true);
  const [voiceEnhance, setVoiceEnhance] = useState(false);
  const [cinemaLight, setCinemaLight] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoQuality, setVideoQuality] = useState("Tự động (1080p)");
  const [expandedComments, setExpandedComments] = useState([]);
  const [activeWatchPill, setActiveWatchPill] = useState("all");
  const [likedCommentsList, setLikedCommentsList] = useState([]);
  const [dislikedCommentsList, setDislikedCommentsList] = useState([]);
  const [sleepTimer, setSleepTimer] = useState(null);

  // YouTube player states
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayActive, setAutoplayActive] = useState(true);
  const [playerState, setPlayerState] = useState(-1);
  const [autoplayTimeLeft, setAutoplayTimeLeft] = useState(null);

  const handleCancelAutoplay = () => {
    setAutoplayTimeLeft(null);
  };

  const handlePlayNow = () => {
    if (relatedVideos.length > 0) {
      handleVideoSelect(relatedVideos[0]);
    }
    setAutoplayTimeLeft(null);
  };

  // ---- All refs BEFORE useEffect that uses them ----
  const sleepTimeoutRef = useRef(null);
  const commentsRef = useRef(null);
  const commentsAutoLoadedRef = useRef(false);
  const autoplayTriggeredRef = useRef(false);
  // IMPORTANT: declare playbackSpeedRef BEFORE the useEffect that references it
  const playbackSpeedRef = useRef(playbackSpeed);
  const settingsMenuRef = useRef(null);
  const settingsBtnRef = useRef(null);

  // Close player settings menu when clicking outside
  useEffect(() => {
    if (!showSettingsMenu) return;
    const handleOutsideClick = (e) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(e.target)
      ) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("pointerdown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("pointerdown", handleOutsideClick, true);
    };
  }, [showSettingsMenu]);

const getPlayableVideoId = (rawId = '', item = null) => {
  if (!rawId) return 'abPmZCZZrFA';
  let s = String(rawId).trim();
  if (s.startsWith('RD') && s.length >= 13) {
    const cand = s.slice(2, 13);
    if (/^[a-zA-Z0-9_-]{11}$/.test(cand)) return cand;
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (s.startsWith('PL') || s.startsWith('OLAK') || s.startsWith('UU') || s.startsWith('RD') || s.startsWith('mix_')) {
    if (item && item.thumbnailUrl) {
      const tm = item.thumbnailUrl.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      if (tm) return tm[1];
    }
    if (item && item.firstVideoId && /^[a-zA-Z0-9_-]{11}$/.test(item.firstVideoId)) {
      return item.firstVideoId;
    }
    if (item && item.items && item.items[0]?.id && /^[a-zA-Z0-9_-]{11}$/.test(item.items[0].id)) {
      return item.items[0].id;
    }
    return 'abPmZCZZrFA';
  }
  const cleaned = s.replace(/^short_(?:api_)?/, '');
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned;
  return 'abPmZCZZrFA';
};

  // Track active video ID in a ref so we can read it inside player initialization without re-triggering it
  const playableId = getPlayableVideoId(activeVideo?.id, activeVideo);
  const activeVideoIdRef = useRef(playableId);
  useEffect(() => {
    activeVideoIdRef.current = getPlayableVideoId(activeVideo?.id, activeVideo);
  }, [activeVideo?.id, activeVideo]);

  // ---- Derived state ----
  const currentVideoState = activeVideo;

  let relatedVideos = [];
  if (currentVideoState) {
    relatedVideos = currentVideoState.recommendedVideos?.length > 0
      ? currentVideoState.recommendedVideos
      : videos.filter((v) => v.type !== "channel" && v.id !== currentVideoState.id);
    
    // Safety check: Filter out any items that are missing channel details to prevent rendering crash
    relatedVideos = relatedVideos.filter(v => v && v.channel);

    if (activeWatchPill === "related") {
      const channelId = currentVideoState.channel?.id;
      const titleWords = (currentVideoState.title || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
      relatedVideos = relatedVideos.filter(v =>
        (v.channel && v.channel.id === channelId) ||
        (v.title && titleWords.some(w => v.title.toLowerCase().includes(w)))
      );
    } else if (activeWatchPill === "for-you") {
      const channelId = currentVideoState.channel?.id;
      relatedVideos = relatedVideos.filter(v => v.channel && v.channel.id !== channelId);
    }
  }

  // ---- Helper functions ----
  const showToast = (msg) => { 
    setToast(msg); 
    if (contextShowToast) contextShowToast(msg);
    setTimeout(() => setToast(null), 2500); 
  };

  // Dynamic live video metadata & authentic YouTube recommendations
  useEffect(() => {
    const vidId = activeVideo?.id;
    if (!vidId) return;

    fetch(`/api/youtube-watch?v=${encodeURIComponent(vidId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.success) {
          const chName = data.channel?.name;
          const chAv = data.channel?.avatar;
          if (chName && chAv && !chAv.startsWith("data:")) {
            setChannelAvatars(p => ({
              ...p,
              [chName.trim().toLowerCase()]: chAv,
              [chName]: chAv,
              ...(data.channel.id ? { [data.channel.id]: chAv } : {})
            }));
          }

          // Automatically mount authentic YouTube playlist queue side panel when playlist is returned
          if (data.playlist && data.playlist.videos && data.playlist.videos.length > 0) {
            setActivePlaylist({
              id: data.playlist.id,
              title: data.playlist.title,
              author: data.playlist.author,
              items: data.playlist.videos
            });
            const curIdx = data.playlist.videos.findIndex(v => v.id === vidId || v.id === data.id);
            setActivePlaylistIndex(curIdx >= 0 ? curIdx : 0);
          }

          setActiveVideo(prev => {
            if (!prev || (prev.id !== vidId && (!data.id || prev.id !== data.id))) return prev;
            const playableTargetId = (vidId.startsWith('PL') || vidId.startsWith('OLAK') || vidId.startsWith('RD')) ? (data.id || prev.id) : prev.id;
            return {
              ...prev,
              id: playableTargetId,
              title: data.title || prev.title,
              views: data.views ? String(data.views).replace(/(lượt\s*xem\s*)+/gi, 'lượt xem') : prev.views,
              uploadedAt: data.date || prev.uploadedAt,
              likes: data.likes || prev.likes,
              description: data.description || prev.description,
              channel: {
                ...prev.channel,
                name: data.channel?.name || prev.channel?.name,
                id: data.channel?.id || prev.channel?.id,
                avatar: (chAv && !chAv.startsWith("data:")) ? chAv : prev.channel?.avatar,
                subscribers: data.channel?.subscribers || prev.channel?.subscribers,
                isVerified: data.channel?.isVerified ?? prev.channel?.isVerified
              },
              recommendedVideos: (data.recommendedVideos && data.recommendedVideos.length > 0)
                ? data.recommendedVideos
                : prev.recommendedVideos
            };
          });
        }
      })
      .catch(() => {});
  }, [activeVideo?.id]);

  // Return YouTube Dislike (RYD) live votes integration
  useEffect(() => {
    const vidId = activeVideo?.id || currentVideoState?.id;
    if (!vidId) return;
    let active = true;
    setDislikeCount(null);
    fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vidId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (active && data && typeof data.dislikes === "number") {
          setDislikeCount(data.dislikes);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [activeVideo?.id, currentVideoState?.id]);

  // Real-time live engagement ticker (subtly increment likes and views while playing)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveVideo(prev => {
        if (!prev) return prev;
        const currentLikes = prev.likesCount || 1000;
        const newLikes = currentLikes + Math.floor(Math.random() * 2) + 1;
        return {
          ...prev,
          likesCount: newLikes,
          likes: newLikes >= 1000000 
            ? `${(newLikes / 1000000).toFixed(1).replace(".", ",")} Tr` 
            : newLikes >= 1000 
              ? `${(newLikes / 1000).toFixed(1).replace(".", ",")} N` 
              : String(newLikes)
        };
      });
    }, 18000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Resolve authentic channel avatar and real subscribers if missing or default
  useEffect(() => {
    const chName = currentVideoState?.channel?.name;
    if (chName && chName !== "Kênh" && chName !== "Kênh YouTube" && (!currentVideoState?.channel?.avatar || currentVideoState.channel.avatar.includes("data:image/svg") || currentVideoState.channel.avatar.includes("dicebear") || currentVideoState.channel.avatar.includes("272727"))) {
      fetch(`/api/channel-avatar?name=${encodeURIComponent(chName)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.success && data.avatar) {
            setActiveVideo(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                channel: {
                  ...prev.channel,
                  avatar: data.avatar,
                  subscribers: data.subCount ? formatSubsVi(data.subCount, chName) : prev.channel?.subscribers
                }
              };
            });
          }
        })
        .catch(() => {});
    }
  }, [currentVideoState?.channel?.name]);

  const [seekRipple, setSeekRipple] = useState(null);
  const clickTimeoutRef = useRef(null);
  const playerSlotRef = useRef(null);

  const handlePlayerMaskClick = (e) => {
    if (isMiniplayerActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (e.detail === 1) {
      togglePlay();
    } else if (e.detail === 2) {
      
      if (clickX < width * 0.38) {
        if (player) {
          try {
            const curTime = player.getCurrentTime();
            const targetTime = Math.max(0, curTime - 10);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
          } catch (err) {}
        }
        setSeekRipple({ side: "left", text: "-10 giây" });
        setTimeout(() => setSeekRipple(null), 650);
      } else if (clickX > width * 0.62) {
        if (player) {
          try {
            const curTime = player.getCurrentTime();
            const dur = player.getDuration() || duration;
            const targetTime = Math.min(dur, curTime + 10);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
          } catch (err) {}
        }
        setSeekRipple({ side: "right", text: "+10 giây" });
        setTimeout(() => setSeekRipple(null), 650);
      } else {
        toggleFullscreen();
      }
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === undefined) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ---- useEffect hooks ----
  // Sync playbackSpeedRef
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  // Mounted guard — prevents setState on unmounted component (memory leak)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Prevent scroll when watch page is active in full screen
  useEffect(() => {
    if (activePage === "watch" && !isMiniplayerActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activePage, isMiniplayerActive]);

  // Polling current time — stop gracefully on unmount, throttled to avoid re-render churn
  const lastTimeRef = useRef(0);
  const lastDurRef = useRef(0);
  useEffect(() => {
    let timer;
    if (player && isPlaying) {
      timer = setInterval(() => {
        if (!mountedRef.current) { clearInterval(timer); return; }
        if (isDraggingProgress.current) return;
        try {
          const curTime = player.getCurrentTime() || 0;
          const dur = player.getDuration() || 0;
          if (Math.abs(curTime - lastTimeRef.current) >= 0.4) {
            lastTimeRef.current = curTime;
            setCurrentTime(curTime);
          }
          if (dur > 0 && Math.abs(dur - lastDurRef.current) > 1) {
            lastDurRef.current = dur;
            setDuration(dur);
          }
          const curData = player.getVideoData();
          if (curData && curData.video_id && curData.video_id !== activeVideoIdRef.current) {
            activeVideoIdRef.current = curData.video_id;
            handleVideoSelect({
              id: curData.video_id,
              title: curData.title || "Video YouTube",
              channel: { name: curData.author || "Kênh YouTube" }
            });
          }
        } catch (e) { clearInterval(timer); }
      }, 500);
    }
    return () => clearInterval(timer);
  }, [player, isPlaying]);

  // Real-time live view counter increment while playing (matching YouTube real-time analytics)
  useEffect(() => {
    let viewTicker;
    if (isPlaying && activeVideo?.viewsCount) {
      viewTicker = setInterval(() => {
        setActiveVideo(prev => {
          if (!prev || !prev.viewsCount) return prev;
          const nextCount = prev.viewsCount + Math.floor(Math.random() * 3) + 1;
          return {
            ...prev,
            viewsCount: nextCount,
            views: formatViewsVi(nextCount)
          };
        });
      }, 15000);
    }
    return () => clearInterval(viewTicker);
  }, [isPlaying, activeVideo?.id]);

  // Load YouTube iframe API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

  const updateAudioTracks = (ytPlayer) => {
    if (ytPlayer && typeof ytPlayer.getAvailableAudioTracks === "function") {
      try {
        const tracks = ytPlayer.getAvailableAudioTracks();
        if (Array.isArray(tracks) && tracks.length > 0) {
          setAudioTracks(tracks);
          const currentTrack = ytPlayer.getAudioTrack();
          setActiveAudioTrack(currentTrack);
        } else {
          setAudioTracks([]);
        }
      } catch (err) {
        console.warn("Failed to get audio tracks:", err);
      }
    }
  };

  // Init / destroy YT Player when server or video ID changes
  useEffect(() => {
    if (playerServer !== "youtube" || !activeVideoIdRef.current) {
      setPlayer(null); setIsPlaying(false);
      return;
    }
    let ytPlayer = null;
    let checkInterval = null;

    const initPlayer = () => {
      if (!playerSlotRef.current) return;
      playerSlotRef.current.innerHTML = '<div id="youtube-player-inner" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>';
      try {
        console.log("Initializing YouTube Player with video:", activeVideoIdRef.current);
        const playlistId = activeVideo?.playlistId 
          || (activeVideo?.id?.startsWith('PL') ? activeVideo.id : null) 
          || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('list') : null);

        const playerVars = { 
          autoplay: 1, 
          controls: 0, 
          modestbranding: 1, 
          rel: 0, 
          showinfo: 0, 
          iv_load_policy: 3, 
          disablekb: 0, 
          origin: window.location.origin,
          cc_load_policy: 1,
          cc_lang_pref: "vi",
          hl: "vi"
        };

        // Always play video directly via videoId to avoid playlist embedding blocks (0:00 stall)
        // Playlist progression is seamlessly managed by activePlaylist state in React

        ytPlayer = new window.YT.Player("youtube-player-inner", {
          width: "100%",
          height: "100%",
          videoId: activeVideoIdRef.current,
          playerVars,
          events: {
            onReady: (e) => {
              setPlayer(e.target);
              try {
                e.target.playVideo();
              } catch (playErr) {
                console.warn("Autoplay block detected:", playErr);
              }
              e.target.setVolume(volume);
              if (lastPlaybackTime > 0) {
                e.target.seekTo(lastPlaybackTime, true);
                setLastPlaybackTime(0); // reset once consumed
              }
              if (playbackSpeedRef.current !== 1) e.target.setPlaybackRate(playbackSpeedRef.current);
              try {
                e.target.loadModule("captions");
                e.target.setOption("captions", "track", { languageCode: "vi" });
              } catch (ccErr) {}
              setIsPlaying(true);
              setIsMuted(e.target.isMuted());
              setDuration(e.target.getDuration() || 0);
              updateAudioTracks(e.target);
            },
            onStateChange: (e) => {
              setPlayerState(e.data);
              try {
                const curData = e.target.getVideoData();
                if (curData && curData.video_id && curData.video_id !== activeVideoIdRef.current) {
                  console.log("In-player video change detected:", curData.video_id);
                  activeVideoIdRef.current = curData.video_id;
                  handleVideoSelect({
                    id: curData.video_id,
                    title: curData.title || "Video YouTube",
                    channel: { name: curData.author || "Kênh YouTube" }
                  });
                }
              } catch (navErr) {}
              if (e.data === 1) {
                setIsPlaying(true);
                updateAudioTracks(e.target);
              }
              else if (e.data === 2 || e.data === 0) {
                setIsPlaying(false);
                if (e.data === 0) {
                  if (activePlaylist && activePlaylist.items && activePlaylist.items.length > 0) {
                    setTimeout(() => {
                      playNextPlaylistItem();
                    }, 600);
                  }
                }
              }
            },
            onApiChange: (e) => {
              try {
                e.target.loadModule("captions");
                const tracklist = e.target.getOption("captions", "tracklist") || [];
                const viTrack = tracklist.find(t => t.languageCode === "vi");
                if (viTrack) {
                  e.target.setOption("captions", "track", { languageCode: "vi" });
                } else {
                  const base = tracklist.find(t => t.languageCode === "en") || tracklist[0];
                  if (base) {
                    e.target.setOption("captions", "track", { languageCode: base.languageCode, translationLanguage: "vi" });
                  } else {
                    e.target.setOption("captions", "track", { languageCode: "vi" });
                  }
                }
              } catch (apiErr) {}
            },
            onError: (e) => {
              console.warn("YouTube Player error encountered (code " + e.data + "), falling back to Invidious stream...");
              setPlayerServer("invidious");
            }
          }
        });
      } catch (err) { console.error("YT.Player init error:", err); }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) { clearInterval(checkInterval); initPlayer(); }
      }, 50);
    }

    return () => {
      clearInterval(checkInterval);
      if (ytPlayer?.destroy) {
        try { ytPlayer.destroy(); } catch (e) {}
      }
      if (playerSlotRef.current) {
        try { playerSlotRef.current.innerHTML = ""; } catch (e) {}
      }
      // Only clear player state if still mounted
      if (mountedRef.current) {
        setPlayer(null); setIsPlaying(false);
      }
    };
  }, [playerServer, activeVideo?.id]);



  // Sleep timer
  useEffect(() => {
    if (sleepTimeoutRef.current) { clearTimeout(sleepTimeoutRef.current); sleepTimeoutRef.current = null; }
    if (sleepTimer && sleepTimer !== "end") {
      sleepTimeoutRef.current = setTimeout(() => {
        if (player && isPlaying) { player.pauseVideo(); setIsPlaying(false); setSleepTimer(null); showToast("Hẹn giờ ngủ: Đã tự động tạm dừng video."); }
      }, sleepTimer * 60 * 1000);
      showToast(`Đã hẹn giờ tắt sau ${sleepTimer} phút`);
    }
  }, [sleepTimer]);

  // Autoplay next (Countdown-driven)
  useEffect(() => {
    if (playerState === 0) {
      if (sleepTimer === "end") { showToast("Hẹn giờ ngủ: Đã dừng phát ở cuối video."); setSleepTimer(null); return; }
      if (autoplayActive && relatedVideos.length > 0 && !autoplayTriggeredRef.current) {
        autoplayTriggeredRef.current = true;
        setAutoplayTimeLeft(5); // Start countdown from 5 seconds
      }
    } else {
      autoplayTriggeredRef.current = false;
      setAutoplayTimeLeft(null); // Reset countdown if video state changes
    }
  }, [playerState, autoplayActive, relatedVideos, sleepTimer]);

  // Countdown timer hook
  useEffect(() => {
    if (autoplayTimeLeft === null) return;
    if (autoplayTimeLeft === 0) {
      if (relatedVideos.length > 0) {
        handleVideoSelect(relatedVideos[0]);
      }
      setAutoplayTimeLeft(null);
      return;
    }

    const t = setTimeout(() => {
      setAutoplayTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(t);
  }, [autoplayTimeLeft, relatedVideos, handleVideoSelect]);

  // Reset state on video change
  useEffect(() => {
    setIsDescExpanded(false); setCommentText(""); setShowCommentActions(false);
    setShowSettingsMenu(false); setSettingsView("main"); setExpandedComments([]);
    setDisliked(false); setSortOrder("top"); setPlayerServer("youtube");
    setCurrentTime(0); setDuration(0); setPlayerState(-1);
    setBackupPlayerError(false);
    autoplayTriggeredRef.current = false;
  }, [activeVideo?.id]);

  // Infinite scroll for related videos
  useEffect(() => {
    const handleScroll = async () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.scrollHeight - 1200) {
        if (!isDetailsLoading && !isFetchingMoreRelated && activeVideo) {
          setIsFetchingMoreRelated(true);
          try { await fetchMoreRelatedVideos(activeVideo); } catch (e) {} finally { setIsFetchingMoreRelated(false); }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeVideo, isDetailsLoading, isFetchingMoreRelated, fetchMoreRelatedVideos]);

  const activeVideoRef = useRef(activeVideo);
  useEffect(() => {
    activeVideoRef.current = activeVideo;
  }, [activeVideo]);

  // Stable comments loading on demand
  useEffect(() => {
    // Keep comments stable without background while loop spam
  }, [activeVideo?.id]);

  // Bind keyboard shortcuts to control the video player
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in inputs or contenteditable elements
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      if (!player) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          try {
            const curTime = player.getCurrentTime();
            const targetTime = Math.max(0, curTime - 5);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
          } catch (err) {
            console.warn("ArrowLeft seek failed:", err);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          try {
            const curTime = player.getCurrentTime();
            const dur = player.getDuration() || duration;
            const targetTime = Math.min(dur, curTime + 5);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
          } catch (err) {
            console.warn("ArrowRight seek failed:", err);
          }
          break;
        case "j":
        case "J":
          e.preventDefault();
          try {
            const curTime = player.getCurrentTime();
            const targetTime = Math.max(0, curTime - 10);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
            showToast("Tua lùi 10 giây");
          } catch (err) {}
          break;
        case "l":
        case "L":
          e.preventDefault();
          try {
            const curTime = player.getCurrentTime();
            const dur = player.getDuration() || duration;
            const targetTime = Math.min(dur, curTime + 10);
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
            showToast("Tua nhanh 10 giây");
          } catch (err) {}
          break;
        case "k":
        case "K":
        case " ": // Spacebar
          e.preventDefault();
          if (isPlaying) {
            player.pauseVideo();
            setIsPlaying(false);
          } else {
            player.playVideo();
            setIsPlaying(true);
          }
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "t":
        case "T":
          e.preventDefault();
          setCinemaLight(s => !s);
          showToast("Đã chuyển chế độ rạp chiếu phim");
          break;
        case "i":
        case "I":
          e.preventDefault();
          togglePiP();
          break;
        case "c":
        case "C":
          e.preventDefault();
          toggleCC();
          break;
        case "ArrowUp":
          e.preventDefault();
          try {
            const curVol = player.getVolume();
            const targetVol = Math.min(100, curVol + 5);
            player.setVolume(targetVol);
            setVolume(targetVol);
            if (targetVol > 0) setIsMuted(false);
          } catch (err) {
            console.warn("ArrowUp volume change failed:", err);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          try {
            const curVol = player.getVolume();
            const targetVol = Math.max(0, curVol - 5);
            player.setVolume(targetVol);
            setVolume(targetVol);
            if (targetVol === 0) setIsMuted(true);
          } catch (err) {
            console.warn("ArrowDown volume change failed:", err);
          }
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          try {
            const pct = parseInt(e.key, 10) / 10;
            const dur = player.getDuration() || duration;
            const targetTime = dur * pct;
            player.seekTo(targetTime, true);
            setCurrentTime(targetTime);
          } catch (err) {}
          break;
        case ">":
          e.preventDefault();
          handleSpeedChange(Math.min(2, playbackSpeed + 0.25));
          break;
        case "<":
          e.preventDefault();
          handleSpeedChange(Math.max(0.25, playbackSpeed - 0.25));
          break;
        case "N":
          if (e.shiftKey) {
            e.preventDefault();
            playNextVideo();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, duration, isPlaying, volume, isMuted, playbackSpeed]);

  // ---- Guard ----
  if (!activeVideo || !activeVideo.id) return null;

  const channelId = activeVideo.channel?.id || "";
  const isSubscribed = Array.isArray(subscriptions) && channelId ? subscriptions.includes(channelId) : false;
  const isLiked = Array.isArray(likedVideos) ? likedVideos.includes(activeVideo.id) : false;

  // ---- Player control functions ----
  const togglePlay = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (showSettingsMenu) {
      setShowSettingsMenu(false);
      return;
    }
    if (!player) return;
    if (isPlaying) { player.pauseVideo(); setIsPlaying(false); }
    else { player.playVideo(); setIsPlaying(true); }
  };
  const toggleMute = () => {
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
      player.setVolume(volume || 100);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };
  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (player && player.setVolume) {
      player.setVolume(newVol);
    }
    if (newVol === 0) {
      setIsMuted(true);
      if (player && player.mute) player.mute();
    } else {
      setIsMuted(false);
      if (player && player.unMute) {
        player.unMute();
        player.setVolume(newVol);
      }
    }
  };
  const toggleCC = () => {
    if (!player) return;
    const next = !captions; 
    setCaptions(next);
    
    if (next) {
      try {
        const tracklist = player.getOption("captions", "tracklist") || [];
        const hasNativeVi = tracklist.some(t => t.languageCode === "vi");
        
        if (hasNativeVi) {
          player.setOption("captions", "track", { languageCode: "vi" });
        } else {
          // Fallback to auto-translate from English or default track to Vietnamese
          const baseTrack = tracklist.find(t => t.languageCode === "en") || tracklist.find(t => t.isDefault) || tracklist[0];
          if (baseTrack) {
            player.setOption("captions", "track", { 
              languageCode: baseTrack.languageCode, 
              translationLanguage: "vi" 
            });
          } else {
            player.setOption("captions", "track", { languageCode: "vi" });
          }
        }
      } catch (e) {
        try { player.setOption("captions", "track", { languageCode: "vi" }); } catch (err) {}
      }
      showToast("Đã bật phụ đề tiếng Việt (Tự động dịch)");
    } else {
      try { player.setOption("captions", "track", {}); } catch (e) {}
      showToast("Đã tắt phụ đề");
    }
  };
  const toggleFullscreen = () => {
    const el = document.querySelector(".video-player-wrapper");
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };
  const handleExpand = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsMiniplayerActive(false);
    navigateTo("watch");
  };

  const handleClose = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsMiniplayerActive(false);
    // Delay to allow animation, then clear the active video
    setTimeout(() => setActiveVideo(null), 50);
  };

  const togglePiP = () => {
    if (!activeVideo) return;
    setIsMiniplayerActive(true);
    navigateTo(backgroundPage || "home");
  };
  const progressBarRef = useRef(null);
  const isDraggingProgress = useRef(false);

  const seekToTime = (t) => {
    const validTime = Math.max(0, Math.min(duration || 0, t));
    setCurrentTime(validTime);
    if (player && typeof player.seekTo === "function") {
      player.seekTo(validTime, true);
    }
  };

  const handleProgressMouseDown = (e) => {
    e.stopPropagation();
    if (!duration || !progressBarRef.current) return;
    isDraggingProgress.current = true;

    const calcTime = (clientX) => {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    };

    seekToTime(calcTime(e.clientX));

    const onMouseMove = (moveEv) => {
      if (!isDraggingProgress.current) return;
      const t = calcTime(moveEv.clientX);
      setCurrentTime(t);
    };

    const onMouseUp = (upEv) => {
      if (isDraggingProgress.current) {
        const t = calcTime(upEv.clientX);
        seekToTime(t);
        isDraggingProgress.current = false;
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleProgressClick = (e) => {
    e.stopPropagation();
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToTime(pct * duration);
  };
  const playNextVideo = () => {
    if (activePlaylist && activePlaylist.items && activePlaylist.items.length > 0) {
      playNextPlaylistItem();
      return;
    }
    if (relatedVideos.length > 0) handleVideoSelect(relatedVideos[0]);
    else showToast("Không có video tiếp theo");
  };
  const playPreviousVideo = () => {
    if (activePlaylist && activePlaylist.items && activePlaylist.items.length > 0) {
      playPrevPlaylistItem();
      return;
    }
    const idx = watchHistory.findIndex(v => v.id === activeVideo.id);
    if (idx !== -1 && idx + 1 < watchHistory.length) handleVideoSelect(watchHistory[idx + 1]);
    else showToast("Không có video trước đó trong lịch sử");
  };

  // ---- Other handlers ----
  const toggleLikeComment = (id) => {
    if (!checkAuth()) return;
    setLikedCommentsList(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setDislikedCommentsList(p => p.filter(x => x !== id));
  };
  const toggleDislikeComment = (id) => {
    if (!checkAuth()) return;
    setDislikedCommentsList(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    setLikedCommentsList(p => p.filter(x => x !== id));
  };
  const handleToggleReplies = (id) => setExpandedComments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const handleLoadMoreComments = async () => {
    if (isLoadingMoreComments) return;
    setIsLoadingMoreComments(true);
    await fetchMoreComments(activeVideo.id, activeVideo.commentsContinuation);
    setIsLoadingMoreComments(false);
  };
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(activeVideo.id, commentText);
    setCommentText(""); setShowCommentActions(false);
  };
  const handleChannelClick = () => {
    const ch = currentVideoState.channel || {};
    let resolvedId = ch.id || currentVideoState.authorId;
    const chName = ch.name || currentVideoState.author || "";
    const lower = chName.toLowerCase();
    if (!resolvedId || resolvedId === "UCst319" || resolvedId.includes("undefined")) {
      if (lower.includes("sơn tùng") || lower.includes("sontung") || lower.includes("sntng") || lower.includes("m-tp")) {
        resolvedId = "UClyA28-01x4z60eWQ2kiNbA";
      } else if (lower.includes("vtv24") || lower.includes("vtv 24")) {
        resolvedId = "UCabsTV34JwALXKGMqHpvUiA";
      } else if (lower.includes("mixi")) {
        resolvedId = "UC5Btzj2W_f5VqAEvE7K2yew";
      } else if (lower.includes("st.319") || lower.includes("st319")) {
        resolvedId = "UCst319";
      } else if (chName) {
        resolvedId = chName;
      }
    }
    handleChannelSelect({
      id: resolvedId,
      name: chName,
      avatar: ch.avatar
    });
  };
  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const url = `${origin}/watch?v=${currentVideoState.id}`;
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch (e) {}

    if (!success) {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        success = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e) {}
    }
    showToast(success ? "Đã sao chép liên kết vào bộ nhớ tạm!" : "Liên kết: " + url);
    setShowShareModal(true);
  };

  const handleDownload = async () => {
    if (downloadVideo) {
      downloadVideo(currentVideoState);
      return;
    }
    showToast("Đang bắt đầu tải video trực tiếp về máy...");
    const downloadEndpoint = `/api/download?id=${encodeURIComponent(currentVideoState.id)}&title=${encodeURIComponent(currentVideoState.title || "video")}`;
    const a = document.createElement("a");
    a.href = downloadEndpoint;
    a.setAttribute("download", `${(currentVideoState.title || "video").replace(/[/\\?%*:|"<>]/g, '_')}.mp4`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const handleDislike = () => {
    if (!checkAuth()) return;
    setDisliked(d => {
      const next = !d;
      if (dislikeCount !== null) {
        setDislikeCount(c => next ? (c || 0) + 1 : Math.max(0, (c || 1) - 1));
      }
      return next;
    });
    if (isLiked) toggleLike(currentVideoState.id);
  };

  // Sort comments
  const sortedComments = [...(currentVideoState.comments || [])].sort((a, b) =>
    sortOrder === "new" ? 0 : (b.likes || 0) - (a.likes || 0)
  );

  return (
    <div className={`video-detail-page ${isMiniplayerActive ? "miniplayer-active" : ""}`}>
      <div className="video-detail-main">
        {/* ─── Video Player ─── */}
        <div className="video-player-outer-container" style={{ position: "relative", width: "100%" }}>
          {cinemaLight && (
            <div style={{
              position: "absolute", top: "-10%", left: "-10%", width: "120%", height: "120%",
              background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0) 70%)",
              filter: "blur(60px)", zIndex: 0, pointerEvents: "none", borderRadius: "50%"
            }} />
          )}

          <div className="video-player-wrapper" style={{
            overflow: "hidden",
            position: "relative",
            zIndex: 2,
            aspectRatio: "16/9",
            width: "100%"
          }}>

            {playerServer === "youtube" ? (
              <>
                <div ref={playerSlotRef} className="youtube-player-slot" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
                {/* Transparent Click Shield: covers entire player area and prevents clicks from reaching native YouTube iframe, allowing crystal clear video and subtitles with zero black masks */}
                <div
                  className="video-player-click-shield"
                  onClick={togglePlay}
                  onDoubleClick={toggleFullscreen}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowSettingsMenu(s => !s);
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 12,
                    cursor: "pointer"
                  }}
                />
                {/* Non-blocking seek ripple overlay */}
                {seekRipple && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "calc(100% - 54px)",
                    pointerEvents: "none",
                    zIndex: 14
                  }}>
                    <div className={`seek-ripple-indicator ${seekRipple.side}`} style={{
                      position: "absolute",
                      top: "50%",
                      [seekRipple.side === "left" ? "left" : "right"]: "15%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      borderRadius: "50%",
                      width: "80px",
                      height: "80px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "600",
                      pointerEvents: "none",
                      animation: "ripplePulse 0.6s ease-out forwards"
                    }}>
                      <span style={{ fontSize: "18px" }}>{seekRipple.side === "left" ? "◀◀" : "▶▶"}</span>
                      <span>{seekRipple.text}</span>
                    </div>
                  </div>
                )}

                {/* Player Controls */}

                {/* Custom Player Controls (Image 2 Parity) */}
                <div className={`custom-player-controls-container ${playerState === 0 ? "video-ended" : ""} ${!isPlaying ? "paused" : ""}`}>
                  {/* Floating In-App "Video khác" Chip (Image 7 Parity) */}
                  {relatedVideos && relatedVideos[0] && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
                      <div
                        className="custom-inapp-next-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVideoSelect(relatedVideos[0]);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(28, 28, 28, 0.88)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255, 255, 255, 0.16)",
                          borderRadius: "20px",
                          padding: "3px 10px 3px 4px",
                          cursor: "pointer",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                          transition: "all 0.2s ease"
                        }}
                        title={`Phát video tiếp theo: ${relatedVideos[0].title}`}
                      >
                        <div style={{ width: "32px", height: "20px", borderRadius: "4px", overflow: "hidden", background: "#000", flexShrink: 0 }}>
                          <img
                            src={relatedVideos[0].thumbnailUrl || `https://i.ytimg.com/vi/${relatedVideos[0].id}/hqdefault.jpg`}
                            alt=""
                            referrerPolicy="no-referrer"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#eee" }}>Video khác</span>
                      </div>
                    </div>
                  )}

                  {/* Progress bar with dragging and precision seeking */}
                  <div
                    ref={progressBarRef}
                    className="custom-progress-bar-wrapper"
                    onMouseDown={handleProgressMouseDown}
                  >
                    <div className="custom-progress-bar-fill" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                    <div className="custom-progress-bar-handle" style={{ left: `${(currentTime / (duration || 1)) * 100}%` }} />
                  </div>

                  {/* Controls row */}
                  <div className="custom-controls-row">
                    <div className="custom-controls-left">
                      <button className="custom-control-btn" onClick={togglePlay} title={isPlaying ? "Tạm dừng" : "Phát"}>
                        {isPlaying
                          ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                          : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
                      </button>
                      <div className="custom-control-capsule">
                        <button className="custom-control-btn" onClick={playPreviousVideo} title="Video trước">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                        </button>
                        <button className="custom-control-btn" onClick={playNextVideo} title="Video tiếp theo">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 18l8.5-6L6 6zm9-12v12h2V6z" /></svg>
                        </button>
                      </div>
                      <div className="volume-control-wrapper">
                        <button className="custom-control-btn" onClick={toggleMute} title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}>
                          {isMuted || volume === 0
                            ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z" /></svg>
                            : volume < 50
                              ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                              : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
                        </button>
                        <div className="volume-slider-container">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                            style={{
                              background: `linear-gradient(to right, #fff 0%, #fff ${isMuted ? 0 : volume}%, rgba(255,255,255,0.3) ${isMuted ? 0 : volume}%, rgba(255,255,255,0.3) 100%)`
                            }}
                            title={`Âm lượng: ${isMuted ? 0 : volume}%`}
                          />
                        </div>
                      </div>
                      <div className="custom-pill-time">
                        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                    </div>

                    <div className="custom-controls-right">
                      {/* Autoplay toggle */}
                      <div className="autoplay-control" title="Tự động phát">
                        <label className="autoplay-switch">
                          <input type="checkbox" checked={autoplayActive} onChange={() => setAutoplayActive(!autoplayActive)} />
                          <span className="autoplay-slider">
                            <span className="autoplay-icon">
                              {autoplayActive
                                ? <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                : <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>}
                            </span>
                          </span>
                        </label>
                      </div>

                      

                      <button className={`custom-control-btn ${captions ? "active" : ""}`} onClick={toggleCC} title="Phụ đề">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" /></svg>
                      </button>

                      <button ref={settingsBtnRef} className="custom-control-btn" onClick={() => setShowSettingsMenu(s => !s)} title="Cài đặt">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" /></svg>
                      </button>

                      <button className="custom-control-btn" onClick={togglePiP} title="Trình thu nhỏ">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" />
                        </svg>
                      </button>

                      <button className="custom-control-btn" onClick={toggleFullscreen} title="Toàn màn hình">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings Menu Popup */}
                {showSettingsMenu && (
                  <div className="player-settings-menu" ref={settingsMenuRef}>
                    {settingsView === "main" ? (
                      <div className="settings-list">
                        
                        <div className="settings-item">
                          <div className="settings-label"><Volume2 size={16} color="#00bcd4" /><span>Âm thanh vòm Dolby Atmos</span></div>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={dolbyAtmos} onChange={() => { setDolbyAtmos(s => !s); showToast(!dolbyAtmos ? "🎧 Đã kích hoạt Dolby Atmos Không gian vòm 3D" : "Đã tắt Dolby Atmos"); }} />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="settings-item">
                          <div className="settings-label"><Volume2 size={16} /><span>Âm lượng ổn định</span></div>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={stableVolume} onChange={() => { setStableVolume(s => !s); showToast(!stableVolume ? "Đã bật âm lượng ổn định" : "Đã tắt âm lượng ổn định"); }} />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="settings-item">
                          <div className="settings-label"><Mic size={16} /><span>Tăng cường giọng nói</span></div>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={voiceEnhance} onChange={() => { setVoiceEnhance(s => !s); showToast(!voiceEnhance ? "Đã bật tăng cường giọng nói" : "Đã tắt tăng cường giọng nói"); }} />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="settings-item">
                          <div className="settings-label"><Sparkles size={16} /><span>Ánh sáng điện ảnh</span></div>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={cinemaLight} onChange={() => { setCinemaLight(s => !s); showToast(!cinemaLight ? "Đã bật ánh sáng điện ảnh" : "Đã tắt ánh sáng điện ảnh"); }} />
                            <span className="slider"></span>
                          </label>
                        </div>
                        <div className="settings-item">
                          <div className="settings-label"><MessageSquare size={16} /><span>Chú thích</span></div>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={captions} onChange={() => { setCaptions(s => !s); toggleCC(); }} />
                            <span className="slider"></span>
                          </label>
                        </div>

                        <div className="settings-item link-item" onClick={() => setSettingsView("sleep")}>
                          <div className="settings-label"><Moon size={16} /><span>Hẹn giờ ngủ</span></div>
                          <span className="settings-value">{sleepTimer === "end" ? "Cuối video" : sleepTimer ? `${sleepTimer} phút` : "Tắt"} &gt;</span>
                        </div>
                        <div className="settings-item link-item" onClick={() => setSettingsView("speed")}>
                          <div className="settings-label"><Gauge size={16} /><span>Tốc độ phát</span></div>
                          <span className="settings-value">{playbackSpeed === 1 ? "Chuẩn" : `${playbackSpeed}x`} &gt;</span>
                        </div>
                        <div className="settings-item link-item" onClick={() => setSettingsView("quality")}>
                          <div className="settings-label"><Settings2 size={16} /><span>Chất lượng</span></div>
                          <span className="settings-value">{videoQuality} &gt;</span>
                        </div>
                      </div>
                    ) : settingsView === "speed" ? (
                      <div className="settings-submenu">
                        <div className="submenu-header" onClick={() => setSettingsView("main")}><span>&lt; Tốc độ phát</span></div>
                        <hr className="settings-divider" />
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                          <div key={s} className={`submenu-item ${playbackSpeed === s ? "active" : ""}`}
                            onClick={() => { setPlaybackSpeed(s); setSettingsView("main"); if (player?.setPlaybackRate) { player.setPlaybackRate(s); showToast(`Tốc độ: ${s === 1 ? "Chuẩn" : s + "x"}`); } }}>
                            <span>{s === 1 ? "Chuẩn" : `${s}x`}</span>
                          </div>
                        ))}
                      </div>
                    ) : settingsView === "quality" ? (
                      <div className="settings-submenu">
                        <div className="submenu-header" onClick={() => setSettingsView("main")}><span>&lt; Chất lượng</span></div>
                        <hr className="settings-divider" />
                        {[
                          "2160p 4K",
                          "1440p HD",
                          "1080p HD",
                          "720p",
                          "480p",
                          "360p",
                          "Tự động (1080p)"
                        ].map(q => (
                          <div key={q} className={`submenu-item ${videoQuality === q ? "active" : ""}`}
                            onClick={() => { setVideoQuality(q); setSettingsView("main"); showToast(`Chất lượng: ${q}`); }}>
                            <span>{q}</span>
                            {q.includes("4K") && (
                              <span style={{
                                marginLeft: "auto",
                                fontSize: "10px",
                                color: "#aaa",
                                fontWeight: 700,
                                background: "rgba(255, 255, 255, 0.1)",
                                padding: "2px 6px",
                                borderRadius: "4px"
                              }}>4K</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="settings-submenu">
                        <div className="submenu-header" onClick={() => setSettingsView("main")}><span>&lt; Hẹn giờ ngủ</span></div>
                        <hr className="settings-divider" />
                        {[{val: null, label: "Tắt"}, {val: 5, label: "5 phút"}, {val: 10, label: "10 phút"}, {val: 15, label: "15 phút"}, {val: 30, label: "30 phút"}, {val: 45, label: "45 phút"}, {val: 60, label: "60 phút"}, {val: "end", label: "Cuối video"}].map(item => (
                          <div key={item.label} className={`submenu-item ${sleepTimer === item.val ? "active" : ""}`}
                            onClick={() => { setSleepTimer(item.val); setSettingsView("main"); }}>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <iframe
                key={playableId}
                className="video-iframe"
                src={`https://www.youtube-nocookie.com/embed/${playableId}?autoplay=1&hl=vi&cc_lang_pref=vi&cc_load_policy=1&enablejsapi=1`}
                title={currentVideoState.title}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: "12px" }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )}

            {/* Autoplay Countdown Overlay */}
            {autoplayTimeLeft !== null && relatedVideos.length > 0 && (
              <div className="autoplay-countdown-overlay" onClick={e => e.stopPropagation()}>
                <div className="autoplay-countdown-backdrop" />
                <div className="autoplay-countdown-card">
                  <span className="autoplay-next-label">Video tiếp theo sẽ phát sau</span>
                  <span className="autoplay-timer-number">{autoplayTimeLeft} giây</span>
                  
                  <div className="autoplay-video-preview">
                    <img 
                      src={relatedVideos[0].thumbnailUrl || `https://i.ytimg.com/vi/${relatedVideos[0].id}/hqdefault.jpg`} 
                      alt={relatedVideos[0].title} 
                      className="autoplay-preview-thumb" 
                      onError={e => { e.target.src = `https://i.ytimg.com/vi/${relatedVideos[0].id}/hqdefault.jpg`; }}
                    />
                    <div className="autoplay-preview-info">
                      <h4 className="autoplay-preview-title">{relatedVideos[0].title}</h4>
                      <p className="autoplay-preview-channel">{relatedVideos[0].channel?.name || "Kênh YouTube"}</p>
                    </div>
                  </div>

                  <div className="autoplay-actions">
                    <button className="autoplay-btn cancel" onClick={handleCancelAutoplay}>HỦY</button>
                    <button className="autoplay-btn play-now" onClick={handlePlayNow}>PHÁT NGAY</button>
                  </div>
                </div>
              </div>
            )}

            {/* Miniplayer Hover Overlay */}
            {isMiniplayerActive && (
              <div className="miniplayer-overlay-controls" onClick={e => e.stopPropagation()}>
                <button className="miniplayer-btn-expand" onClick={(e) => { e.stopPropagation(); handleExpand(e); }} title="Mở rộng">
                  <Maximize2 size={14} />
                </button>
                <button className="miniplayer-btn-close" onClick={(e) => { e.stopPropagation(); handleClose(e); }} title="Đóng">
                  <X size={14} />
                </button>

                <div className="miniplayer-center-controls">
                  <button className="miniplayer-btn-play" onClick={(e) => { e.stopPropagation(); togglePlay(e); }} title={isPlaying ? "Tạm dừng" : "Phát"}>
                    {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" />}
                  </button>
                  <button className="miniplayer-btn-next" onClick={(e) => { e.stopPropagation(); playNextVideo(); }} title="Video tiếp theo">
                    <SkipForward size={14} fill="#ffffff" />
                  </button>
                </div>

                <div className="miniplayer-time-duration">
                  {formatTime(currentTime)} / {formatTime(duration || 0)}
                </div>
                <div className="miniplayer-progress-bar-fill" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
              </div>
            )}
          </div>

        </div>

        {/* Miniplayer Rich Info Bar */}
        {isMiniplayerActive && (() => {
          const chMeta = resolveChannelMetaFromVideo(currentVideoState);
          return (
            <div className="miniplayer-info-bar" onClick={handleExpand}>
              <img 
                src={chMeta.avatar}
                alt="avatar" 
                className="miniplayer-channel-avatar" 
                onError={e => { e.target.src = getFallbackAvatar(chMeta.name); }}
              />
              <div className="miniplayer-info-text-col">
                <div className="miniplayer-title" title={currentVideoState.title}>
                  {currentVideoState.title}
                </div>
                <div className="miniplayer-channel">
                  <span>{chMeta.name}</span>
                  {chMeta.isVerified && <VerifiedBadge />}
                  <span className="dot-separator">•</span>
                  <span>{currentVideoState.views}</span>
                </div>
              </div>
              <div className="miniplayer-actions-col" onClick={e => e.stopPropagation()}>
                <button className="miniplayer-action-icon-btn" onClick={(e) => { e.stopPropagation(); togglePlay(e); }} title={isPlaying ? "Tạm dừng" : "Phát"}>
                  {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}
                </button>
                <button className="miniplayer-action-icon-btn" onClick={(e) => { e.stopPropagation(); playNextVideo(); }} title="Video tiếp theo">
                  <SkipForward size={16} fill="#fff" />
                </button>
                <button className="miniplayer-action-icon-btn" onClick={(e) => { e.stopPropagation(); handleExpand(e); }} title="Mở rộng">
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className="miniplayer-progress-track">
                <div className="miniplayer-progress-bar-fill" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
              </div>
            </div>
          );
        })()}

        {/* ─── Video Title ─── */}
        <h1 className="video-detail-title">{(currentVideoState.title || "").replace(/[\uFFFC\uFFFD\uFEFF]/g, "").trim()}</h1>

        {/* ─── Channel + Subscribe + Actions (all on same section like ảnh 3) ─── */}
        <div className="channel-action-row">
          {/* Left: channel info + subscribe */}
          {(() => {
            const chMeta = resolveChannelMetaFromVideo(currentVideoState);
            return (
              <div className="channel-section">
                <img
                  src={chMeta.avatar}
                  alt={chMeta.name}
                  className="channel-detail-avatar cursor-pointer"
                  onClick={handleChannelClick}
                  onError={e => { e.target.src = getFallbackAvatar(chMeta.name); }}
                />
                <div className="channel-detail-meta">
                  <h4 className="channel-detail-name cursor-pointer" onClick={handleChannelClick}>
                    {chMeta.name}
                    {chMeta.isVerified && <VerifiedBadge />}
                  </h4>
                  <p className="channel-detail-subs">
                    {(() => {
                      const chName = (chMeta.name || "").toLowerCase();
                      const chId = chMeta.id || "";
                      if (chName.includes("sơn tùng") || chName.includes("sontung") || chId === "UClyA28-01x4z60eWQ2kiNbA" || chId === "UCGaV49s3N3x3k625aX2Q8sw") {
                        return "11,9 Tr người đăng ký";
                      }
                      if (chName.includes("vtv24") || chId === "UCabsTV34JwALXKGMqHpvUiA") {
                        return "7,01 Tr người đăng ký";
                      }
                      if (chName.includes("st.319") || chName.includes("st319")) {
                        return "1,98 Tr người đăng ký";
                      }
                      if (chName.includes("mixi")) {
                        return "7,5 Tr người đăng ký";
                      }
                      const subs = currentVideoState.channel?.subscribers;
                      if (subs && !subs.includes("100 N") && !subs.includes("279 N")) return subs;
                      return KNOWN_CHANNEL_SUBS[(chMeta.name || "").toLowerCase().trim()] || formatSubsVi(currentVideoState.channel?.subscribersCount || 0, chMeta.name);
                    })()}
                  </p>
                </div>
                <button
                  className={`subscribe-btn ${isSubscribed ? "subscribed" : ""}`}
                  onClick={() => chMeta.id && toggleSubscribe(chMeta.id)}
                >
                  {isSubscribed ? "Đã đăng ký" : "Đăng ký"}
                </button>
              </div>
            );
          })()}

          {/* Right: action pills */}
          <div className="actions-section">
            {/* Like / Dislike pill */}
            <div className="like-dislike-pill">
              <button className={`like-btn-split ${isLiked ? "liked" : ""}`}
                onClick={() => { if (checkAuth()) toggleLike(currentVideoState.id); }} title="Thích">
                <ThumbsUp size={18} className={isLiked ? "fill-icon" : ""} />
                {currentVideoState.likes ? (
                  <span>{currentVideoState.likes}</span>
                ) : (
                  <span>1,2 N</span>
                )}
              </button>
              <div className="like-dislike-divider" />
              <button className={`dislike-btn-split ${disliked ? "disliked" : ""}`} onClick={handleDislike} title="Không thích">
                <ThumbsDown size={18} className={disliked ? "fill-icon" : ""} />
                {dislikeCount !== null && dislikeCount > 0 && (
                  <span style={{ marginLeft: "6px", fontSize: "14px", fontWeight: "500" }}>
                    {dislikeCount >= 1000000
                      ? `${(dislikeCount / 1000000).toFixed(1).replace(".", ",")} Tr`
                      : dislikeCount >= 1000
                        ? `${(dislikeCount / 1000).toFixed(1).replace(".", ",").replace(/,0$/, "")} N`
                        : dislikeCount}
                  </span>
                )}
              </button>
            </div>

            <button className="action-pill-btn" onClick={handleShare}>
              <Share2 size={18} /><span>Chia sẻ</span>
            </button>

            <button 
              className={`action-pill-btn ${isDownloaded && isDownloaded(currentVideoState.id) ? "active-pill" : ""}`} 
              onClick={() => downloadVideo && downloadVideo(currentVideoState)} 
              title={isDownloaded && isDownloaded(currentVideoState.id) ? "Đã tải xuống (Bấm để tải lại về máy)" : "Tải xuống"}
            >
              <Download size={18} /><span>{isDownloaded && isDownloaded(currentVideoState.id) ? "Đã tải xuống" : "Tải xuống"}</span>
            </button>

            <button 
              className="action-pill-btn"
              onClick={() => setShowPlaylistModal(true)} 
              title="Lưu vào danh sách phát"
            >
              <ListPlus size={18} />
              <span>Lưu</span>
            </button>

            <div style={{ position: "relative" }}>
              <button 
                className="action-pill-btn icon-only" 
                onClick={() => setShowMoreMenu(s => !s)}
                title="Tùy chọn khác"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMoreMenu && (
                <MoreOptionsDropdown 
                  onDownload={() => downloadVideo(currentVideoState)}
                  onReport={() => setShowReportModal(true)}
                  onShortcuts={() => setShowShortcutsModal(true)}
                  onClose={() => setShowMoreMenu(false)}
                />
              )}
            </div>


          </div>
        </div>

        {/* ─── Description Box ─── */}
        {isDetailsLoading && !currentVideoState.description ? (
          <div className="description-box skeleton">
            <div className="skeleton-box" style={{ height: "14px", width: "200px", marginBottom: "8px", borderRadius: "3px" }} />
            <div className="skeleton-box" style={{ height: "36px", width: "100%", borderRadius: "3px" }} />
          </div>
        ) : (
          <div
            className={`description-box ${isDescExpanded ? "expanded" : ""}`}
            onClick={() => !isDescExpanded && setIsDescExpanded(true)}
          >
            <div className="description-meta">
              <span className="views-count-text">
                {String(currentVideoState.views || '').replace(/(lượt\s*xem\s*)+/gi, 'lượt xem')}
              </span>
              <span className="uploaded-time-text">{currentVideoState.uploadedAt}</span>
              {getHashtags(currentVideoState.description, currentVideoState.title) && (
                <span className="desc-hashtag">{getHashtags(currentVideoState.description, currentVideoState.title)}</span>
              )}
            </div>
            <p className="description-text" style={{ whiteSpace: "pre-wrap" }}>
              {currentVideoState.description}
            </p>
            {/* Channel description shown when expanded */}
            {currentVideoState.channel?.description && isDescExpanded && (
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <img src={currentVideoState.channel?.avatar || getFallbackAvatar(currentVideoState.channel?.name || "Kênh")} alt={currentVideoState.channel?.name || "Kênh"}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }}
                    onError={e => { e.target.src = getFallbackAvatar(currentVideoState.channel?.name || "Kênh"); }} />
                  <span style={{ fontWeight: 600, fontSize: "13px", color: "#fff" }}>{currentVideoState.channel?.name || "Kênh"}</span>
                  {currentVideoState.channel?.subscribers && (
                    <span style={{ fontSize: "12px", color: "#aaa" }}>{currentVideoState.channel.subscribers}</span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>
                  {currentVideoState.channel?.description}
                </p>
              </div>
            )}
            <button className="description-toggle-btn" onClick={e => { e.stopPropagation(); setIsDescExpanded(s => !s); }}>
              {isDescExpanded ? "Ẩn bớt" : "...thêm"}
            </button>
          </div>
        )}

        {/* ─── Comments Section ─── */}
        <div className="video-comments-container" ref={commentsRef}>
          <div className="comments-header-row">
            <h3 className="comments-count-title">
              {currentVideoState.commentCount ? (
                <span>{Number(currentVideoState.commentCount).toLocaleString("vi-VN")} bình luận</span>
              ) : (currentVideoState.comments && currentVideoState.comments.length > 0) ? (
                <span>{currentVideoState.comments.length.toLocaleString("vi-VN")} bình luận</span>
              ) : currentVideoState.commentsLoading ? (
                <span style={{ color: "#aaa", fontSize: "15px" }}>Đang tải bình luận...</span>
              ) : (
                <span>0 bình luận</span>
              )}
            </h3>
            <div style={{ position: "relative" }}>
              <button className="sort-comments-btn" onClick={() => setShowSortMenu(s => !s)}>
                <ListFilter size={18} />
                <span>Sắp xếp theo: {sortOrder === "top" ? "Phổ biến nhất" : "Mới nhất"}</span>
              </button>
              {showSortMenu && (
                <div className="sort-dropdown">
                  <div className={`sort-option ${sortOrder === "top" ? "active" : ""}`} onClick={() => { setSortOrder("top"); setShowSortMenu(false); }}>Phổ biến nhất</div>
                  <div className={`sort-option ${sortOrder === "new" ? "active" : ""}`} onClick={() => { setSortOrder("new"); setShowSortMenu(false); }}>Mới nhất</div>
                </div>
              )}
            </div>
          </div>

          {/* Comment Input */}
          <form className="new-comment-form" onSubmit={handleCommentSubmit}>
            <img src={(currentUser?.avatar && !currentUser.avatar.includes("WkRGl") && !currentUser.avatar.includes("default-user")) ? currentUser.avatar : "https://yt3.googleusercontent.com/ytc/AIdro_mrMQ8nwQsLxyCaQsjbiDx3uE62LqCQTqH7S8q2f0XffL0=s240-c-k-c0x00ffffff-no-rj"} alt="avatar"
              className="comment-user-avatar" onError={e => { e.target.src = "https://yt3.googleusercontent.com/ytc/AIdro_mrMQ8nwQsLxyCaQsjbiDx3uE62LqCQTqH7S8q2f0XffL0=s240-c-k-c0x00ffffff-no-rj"; }} />
            <div className="comment-input-area">
              <input type="text" placeholder="Thêm bình luận..." value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onFocus={() => { if (checkAuth()) setShowCommentActions(true); else document.activeElement.blur(); }}
                className="comment-input" />
              {showCommentActions && (
                <div className="comment-actions">
                  <button type="button" className="cancel-comment-btn" onClick={() => { setCommentText(""); setShowCommentActions(false); }}>Hủy</button>
                  <button type="submit" className="submit-comment-btn" disabled={!commentText.trim()}>Bình luận</button>
                </div>
              )}
            </div>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {(sortedComments || []).length > 0 ? (
              <>
                {(sortedComments || []).map(comment => {
                  if (!comment) return null;
                  const replies = getDeterministicReplies(comment.id, comment.author);
                  const isExpanded = expandedComments.includes(comment.id);
                  const hasHeart = comment.isCreatorHearted || getDeterministicHeart(comment.id, comment.author);
                  return (
                    <div key={comment.id} className="comment-container-block">
                      <div className="comment-item">
                        <img src={comment.avatar || getFallbackAvatar(comment.author)} alt={comment.author} className="comment-avatar" referrerPolicy="no-referrer"
                          onError={e => { e.target.src = getFallbackAvatar(comment.author); }} />
                        <div className="comment-content">
                          <div className="comment-meta">
                            <span className="comment-author">{getCommentHandle(comment.author)}</span>
                            <span className="comment-time">{translateDateVi(comment.uploadedAt, comment.id || comment.author)}</span>
                          </div>
                          <p className="comment-text">{comment.text}</p>
                          <div className="comment-actions-row">
                            <button className={`comment-action-btn ${likedCommentsList.includes(comment.id) ? "liked" : ""}`}
                              onClick={() => toggleLikeComment(comment.id)}
                              style={{ color: likedCommentsList.includes(comment.id) ? "#3ea6ff" : "inherit" }}>
                              <ThumbsUp size={14} className={likedCommentsList.includes(comment.id) ? "fill-icon" : ""} />
                              <span>{formatCommentLikes(comment.likes + (likedCommentsList.includes(comment.id) ? 1 : 0))}</span>
                            </button>
                            <button className={`comment-action-btn ${dislikedCommentsList.includes(comment.id) ? "disliked" : ""}`}
                              onClick={() => toggleDislikeComment(comment.id)}
                              style={{ color: dislikedCommentsList.includes(comment.id) ? "#3ea6ff" : "inherit" }}>
                              <ThumbsDown size={14} className={dislikedCommentsList.includes(comment.id) ? "fill-icon" : ""} />
                            </button>
                            <button className="comment-action-btn reply-btn"
                              onClick={() => handleStartReply(comment.id, getCommentHandle(comment.author))}>
                              Phản hồi
                            </button>
                            {hasHeart && (
                              <div className="creator-heart-badge" title={`Đã được thả tim bởi ${currentVideoState.channel?.name || "Kênh"}`}>
                                <img src={currentVideoState.channel?.avatar || getFallbackAvatar(currentVideoState.channel?.name || "Kênh")} alt="Creator" className="creator-heart-avatar"
                                  onError={e => { e.target.src = getFallbackAvatar(currentVideoState.channel?.name || "Kênh"); }} />
                                <div className="heart-icon-overlay">❤️</div>
                              </div>
                            )}
                          </div>

                          {replyingCommentId === comment.id && (
                            <form className="comment-reply-form" onSubmit={(e) => handleSubmitReply(e, comment.id)} style={{ display: "flex", gap: "10px", marginTop: "12px", marginBottom: "8px" }}>
                              <img src={(currentUser?.avatar && !currentUser.avatar.includes("WkRGl") && !currentUser.avatar.includes("default-user")) ? currentUser.avatar : "https://yt3.googleusercontent.com/ytc/AIdro_mrMQ8nwQsLxyCaQsjbiDx3uE62LqCQTqH7S8q2f0XffL0=s240-c-k-c0x00ffffff-no-rj"} alt="Avatar" className="reply-avatar" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                              <div style={{ flex: 1 }}>
                                <input
                                  type="text"
                                  placeholder={`Phản hồi cho ${getCommentHandle(comment.author)}...`}
                                  value={replyInputText}
                                  onChange={(e) => setReplyInputText(e.target.value)}
                                  autoFocus
                                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #3ea6ff", color: "#f1f1f1", padding: "6px 0", fontSize: "13px", outline: "none" }}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                                  <button type="button" onClick={() => { setReplyingCommentId(null); setReplyInputText(""); }} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: "12px", padding: "6px 14px", borderRadius: "18px", cursor: "pointer" }}>
                                    Hủy
                                  </button>
                                  <button type="submit" disabled={!replyInputText.trim()} style={{ background: replyInputText.trim() ? "#3ea6ff" : "rgba(255,255,255,0.1)", border: "none", color: replyInputText.trim() ? "#0f0f0f" : "#717171", fontSize: "12px", fontWeight: "600", padding: "6px 14px", borderRadius: "18px", cursor: replyInputText.trim() ? "pointer" : "not-allowed" }}>
                                    Phản hồi
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>

                      {(replies.length > 0 || comment.replyCount > 0) && (
                        <button className="comment-replies-toggle" onClick={() => handleToggleReplies(comment.id)}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span>{comment.replyCount > 0 ? comment.replyCount : replies.length} phản hồi</span>
                        </button>
                      )}

                      {isExpanded && replies.length > 0 && (
                        <div className="comment-replies-list">
                          {replies.map(reply => (
                            <div key={reply.id} className="reply-item">
                              <img src={reply.avatar} alt={reply.author} className="reply-avatar"
                                onError={e => { e.target.src = getFallbackAvatar(reply.author); }} />
                              <div className="reply-content">
                                <div className="reply-meta">
                                  <span className="reply-author">{getCommentHandle(reply.author)}</span>
                                  <span className="reply-time">{reply.uploadedAt}</span>
                                </div>
                                <p className="reply-text">{reply.text}</p>
                                <div className="reply-actions-row">
                                  <button className={`reply-action-btn comment-action-btn ${likedCommentsList.includes(reply.id) ? "liked" : ""}`}
                                    onClick={() => toggleLikeComment(reply.id)}
                                    style={{ color: likedCommentsList.includes(reply.id) ? "#3ea6ff" : "inherit" }}>
                                    <ThumbsUp size={12} className={likedCommentsList.includes(reply.id) ? "fill-icon" : ""} />
                                    <span>{formatCommentLikes(reply.likes + (likedCommentsList.includes(reply.id) ? 1 : 0))}</span>
                                  </button>
                                  <button className={`reply-action-btn comment-action-btn ${dislikedCommentsList.includes(reply.id) ? "disliked" : ""}`}
                                    onClick={() => toggleDislikeComment(reply.id)}>
                                    <ThumbsDown size={12} className={dislikedCommentsList.includes(reply.id) ? "fill-icon" : ""} />
                                  </button>
                                  <button className="reply-action-btn comment-action-btn reply-btn"
                                    onClick={() => handleStartReply(comment.id, getCommentHandle(reply.author))}>
                                    Phản hồi
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <button className="load-more-comments-btn" onClick={handleLoadMoreComments} disabled={isLoadingMoreComments}>
                    {isLoadingMoreComments ? <><span className="spinner-inline" /> Đang tải...</> : "Xem thêm bình luận"}
                  </button>
                </div>
              </>
            ) : (isDetailsLoading || currentVideoState.commentsLoading) ? (
              Array.from({ length: 4 }).map((_, i) => <CommentSkeleton key={i} />)
            ) : (
              <p className="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Sidebar ─── */}
      <div className="video-detail-sidebar">
        {/* ─── YouTube Authentic Playlist Panel (Image 2 Parity) ─── */}
        {activePlaylist && activePlaylist.items && activePlaylist.items.length > 0 && (
          <div className="ytd-playlist-panel-renderer">
            <div className="playlist-panel-header">
              <div className="playlist-panel-header-left">
                <h3 className="playlist-panel-title" title={activePlaylist.title}>
                  {activePlaylist.title}
                </h3>
                <div className="playlist-panel-subtitle">
                  <span className="playlist-panel-author">
                    {activePlaylist.author || activeVideo.channel?.name || "YouTube"}
                  </span>
                  <span className="playlist-panel-sep"> - </span>
                  <span className="playlist-panel-counter">
                    {activePlaylistIndex + 1}/{activePlaylist.items.length}
                  </span>
                </div>
              </div>
              <div className="playlist-panel-header-actions">
                <button
                  className={`playlist-action-icon-btn ${isPlaylistLoop ? "active" : ""}`}
                  onClick={togglePlaylistLoop}
                  title="Danh sách phát lặp"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                  </svg>
                </button>
                <button
                  className={`playlist-action-icon-btn ${isPlaylistShuffle ? "active" : ""}`}
                  onClick={togglePlaylistShuffle}
                  title="Danh sách phát ngẫu nhiên"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                  </svg>
                </button>
                <button
                  className="playlist-action-icon-btn"
                  onClick={closePlaylist}
                  title="Thu gọn"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
                <button
                  className="playlist-action-icon-btn"
                  title="Menu tác vụ"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="playlist-panel-items-list">
              {activePlaylist.items.map((item, idx) => {
                const isSelected = idx === activePlaylistIndex;
                return (
                  <div
                    key={item.id || idx}
                    className={`playlist-panel-item ${isSelected ? "selected" : ""}`}
                    onClick={() => playPlaylistItem(idx)}
                  >
                    <div className="playlist-item-index">
                      {isSelected ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#ffffff">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="playlist-item-thumb-wrapper">
                      <img
                        src={item.thumbnailUrl || (item.id ? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` : 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg')}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleThumbnailError(e, item.id, item.title)}
                      />
                      <span className="playlist-item-duration">{item.duration || "3:55"}</span>
                    </div>
                    <div className="playlist-item-meta">
                      <h4 className="playlist-item-title" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="playlist-item-byline">
                        {item.author || activePlaylist.author || activeVideo.channel?.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="watch-sidebar-pills">
          {["all", "related", "for-you"].map(p => (
            <button key={p} className={`watch-pill ${activeWatchPill === p ? "active" : ""}`}
              onClick={() => setActiveWatchPill(p)}>
              {p === "all" ? "Tất cả" : p === "related" ? "Video có liên quan" : "Dành cho bạn"}
            </button>
          ))}
        </div>
        <div className="related-videos-list">
          {isDetailsLoading
            ? Array.from({ length: 5 }).map((_, i) => <RelatedVideoSkeleton key={i} />)
            : relatedVideos.map(video => (
              <div key={video.id} className="related-video-card" 
                onClick={() => handleVideoSelect(video)}
                onMouseEnter={() => { prefetchVideo(video); prefetchChannel(video.channel); }}
              >
                <div className="related-thumbnail-container">
                  <img 
                    src={video.thumbnailUrl || (video.id ? `https://i.ytimg.com/vi/${video.id}/sddefault.jpg` : 'https://i.ytimg.com/vi/yuuWdm5tBD0/hqdefault.jpg')} 
                    alt={video.title} 
                    className="related-thumbnail" 
                    referrerPolicy="no-referrer"
                    onError={(e) => handleThumbnailError(e, video.id, video.title)} 
                  />
                  <span className="related-duration">{video.duration}</span>
                </div>
                <div className="related-info">
                  <h4 className="related-title" title={video.title}>{video.title}</h4>
                  <p className="related-channel">
                    {(() => {
                      const chMeta = resolveChannelMetaFromVideo(video);
                      return (
                        <>
                          <span>{chMeta.name}</span>
                          {chMeta.isVerified && <VerifiedBadge />}
                        </>
                      );
                    })()}
                  </p>
                  <div className="related-stats">
                    <span>{video.views}</span>
                    <span className="dot-separator">•</span>
                    <span>{video.uploadedAt}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showShareModal && <ShareModal video={currentVideoState} onClose={() => setShowShareModal(false)} />}
      {showPlaylistModal && <PlaylistModal video={currentVideoState} onClose={() => setShowPlaylistModal(false)} />}
      {showReportModal && <ReportModal video={currentVideoState} onClose={() => setShowReportModal(false)} />}
      {showShortcutsModal && <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />}
      {toast && <div className="video-toast">{toast}</div>}
    </div>
  );
};

export default VideoDetail;
