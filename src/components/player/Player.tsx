import "./player-style.css";
import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecoilState } from "recoil";
import { PlayerState } from "../../recoil/atoms/PlayerState";
import { SongsState } from "../../recoil/atoms/SongsState";
import { defaultSongs } from "../../constants/songs";
import useContainerClick from "use-container-click";
import PlayerInfo from "./player-info";
import Controls from "./controls/Controls";
import Cashtab from "./cashtab";
import { initialPlayerState, playerReducer } from "./reducer/player-reducer";
import * as Popover from "@radix-ui/react-popover";
import { ReactComponent as PlayIcon } from "../../icons/play-icon.svg";
import { ReactComponent as PauseIcon } from "../../icons/pause-icon.svg";
import { trackEvent } from "../../utils/ga";
import axios from "axios";

export type PlayerProps = {
  player?: any;
};

function Player({ player }: PlayerProps) {
  const [playerData, setPlayerData] = useRecoilState(PlayerState);
  const [songsData, setSongsData] = useRecoilState(SongsState);
  const [playerState, dispatch] = useReducer(playerReducer, initialPlayerState);
  const infoRef = useRef(document.createElement("div"));
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { isCashtabVisible, isInfoVisible } = playerState;
  const { isPlaying, volume, activeSong } = playerData as any;

  // Находим текущий трек из нашего массива defaultSongs по ID
  const songMeta = defaultSongs.find((song) => song.id === activeSong) || defaultSongs[0];
  const title = songMeta?.title || "Unknown Track";
  const author = songMeta?.author || "Unknown Artist";

  useContainerClick(infoRef, () => {
    if (infoRef.current) dispatch({ type: "SET_SHOW_INFO", payload: false });
  });

  const [currentDuration, setCurrentDuration] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Управление HTML5 Аудио
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Audio play error:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeSong]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentDuration(audioRef.current.currentTime);
      setTotalDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    handleNextClick();
  };

  // Timer and PiP state/ref management inside Player
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [docPipWindow, setDocPipWindow] = useState<any>(null);
  const docPipRef = useRef<any>(null);

  useEffect(() => {
    docPipRef.current = docPipWindow;
  }, [docPipWindow]);

  const isDocPiPSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;
  const isPiPSupported = isDocPiPSupported || (typeof document !== "undefined" && "pictureInPictureEnabled" in document);

  const handleStartPause = () => {
    setPlayerData((prev) => {
      const nextIsRunning = !prev.isTimerRunning;
      let nextSeconds = prev.timerSecondsRemaining;
      if (prev.timerSecondsRemaining === 0) {
        nextSeconds = (prev.timerMode === "work" ? prev.timerWorkTime : prev.timerBreakTime) * 60;
      }
      trackEvent(nextIsRunning ? "Timer Started" : "Timer Paused", {
        mode: prev.timerMode,
        remainingSeconds: nextSeconds,
        focusMinutes: prev.timerWorkTime,
        breakMinutes: prev.timerBreakTime,
        source: "pip_window",
      });
      return {
        ...prev,
        isTimerRunning: nextIsRunning,
        timerSecondsRemaining: nextSeconds,
      };
    });
  };

  const resetTimer = () => {
    trackEvent("Timer Reset", {
      mode: playerData.timerMode,
      focusMinutes: playerData.timerWorkTime,
      breakMinutes: playerData.timerBreakTime,
      source: "pip_window",
    });
    setPlayerData((prev) => ({
      ...prev,
      isTimerRunning: false,
      timerMode: "work",
      timerSecondsRemaining: prev.timerWorkTime * 60,
    }));
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playNote(659.25, now, 0.4);
      playNote(880.00, now + 0.15, 0.6);
    } catch (e) {
      console.error("Failed to play notification sound", e);
    }
  };

  useEffect(() => {
    let intervalId: any = null;
    if (playerData.isTimerRunning) {
      intervalId = setInterval(() => {
        setPlayerData((prev) => {
          if (prev.timerSecondsRemaining <= 1) {
            playNotificationSound();
            const nextMode = prev.timerMode === "work" ? "break" : "work";
            trackEvent("Timer Completed", {
              completedMode: prev.timerMode,
              nextMode: nextMode,
              focusMinutes: prev.timerWorkTime,
              breakMinutes: prev.timerBreakTime,
            });
            return {
              ...prev,
              timerMode: nextMode,
              timerSecondsRemaining: 0,
              isTimerRunning: false,
            };
          }
          return {
            ...prev,
            timerSecondsRemaining: prev.timerSecondsRemaining - 1,
          };
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [playerData.isTimerRunning, playerData.timerMode, playerData.timerWorkTime, playerData.timerBreakTime]);

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const timeStr = formatTime(playerData.timerSecondsRemaining);

  const [blinkVisible, setBlinkVisible] = useState(true);

  useEffect(() => {
    let intervalId: any = null;
    if (playerData.timerSecondsRemaining === 0) {
      intervalId = setInterval(() => {
        setBlinkVisible((v) => !v);
      }, 500);
    } else {
      setBlinkVisible(true);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [playerData.timerSecondsRemaining]);

  const drawCanvas = (timeStr: string, blinkVisible: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const primaryColor = getComputedStyle(document.body).getPropertyValue("--primary_color").trim() || "#9493fb";
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, canvas.height - 12, canvas.width, 12);

    ctx.fillStyle = primaryColor;
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(playerData.timerMode === "work" ? "FOCUS" : "BREAK", canvas.width / 2, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 130px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (playerData.timerSecondsRemaining > 0 || blinkVisible) {
      ctx.fillText(timeStr, canvas.width / 2, canvas.height / 2 - 6 + 30);
    }
  };

  useEffect(() => {
    drawCanvas(timeStr, blinkVisible);
  }, [playerData.timerSecondsRemaining, playerData.isCustomTheme, blinkVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playerData.isTimerRunning) {
      if (video.paused) {
        video.play().catch((err) => console.error("Error playing fallback video", err));
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [playerData.isTimerRunning]);

  useEffect(() => {
    if (docPipWindow) {
      const primaryColor = getComputedStyle(document.body).getPropertyValue("--primary_color").trim();
      const secondaryColor = getComputedStyle(document.body).getPropertyValue("--secondary_color").trim();
      docPipWindow.document.body.style.setProperty("--primary_color", primaryColor);
      docPipWindow.document.body.style.setProperty("--secondary_color", secondaryColor);
    }
  }, [playerData.isCustomTheme, docPipWindow]);

  useEffect(() => {
    return () => {
      if (docPipRef.current) {
        docPipRef.current.close();
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        if (document.pictureInPictureElement === videoRef.current) {
          document.exitPictureInPicture().catch(() => { });
        }
      }
    };
  }, []);

  const handleTogglePiP = async () => {
    const nextState = !playerData.isPiPActive;
    trackEvent("Timer PiP Toggled", {
      active: nextState,
      type: isDocPiPSupported ? "document" : "video",
    });
    if (isDocPiPSupported) {
      if (docPipWindow) {
        docPipWindow.close();
        setDocPipWindow(null);
        setPlayerData((prev) => ({ ...prev, isPiPActive: false }));
      } else {
        try {
          const pip = await (window as any).documentPictureInPicture.requestWindow({
            width: 320,
            height: 180,
          });

          [...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
              const style = pip.document.createElement('style');
              style.textContent = cssRules;
              pip.document.head.appendChild(style);
            } catch (e) {
              if (styleSheet.href) {
                const link = pip.document.createElement('link');
                link.rel = 'stylesheet';
                link.href = styleSheet.href;
                pip.document.head.appendChild(link);
              }
            }
          });

          pip.document.body.style.background = "#161616";
          pip.document.body.style.margin = "0";
          pip.document.body.style.overflow = "hidden";

          const mainBodyStyle = window.getComputedStyle(document.body);
          const primaryColor = mainBodyStyle.getPropertyValue("--primary_color");
          const secondaryColor = mainBodyStyle.getPropertyValue("--secondary_color");
          if (primaryColor) pip.document.body.style.setProperty("--primary_color", primaryColor);
          if (secondaryColor) pip.document.body.style.setProperty("--secondary_color", secondaryColor);

          pip.addEventListener("pagehide", () => {
            setDocPipWindow(null);
            setPlayerData((prev) => ({ ...prev, isPiPActive: false }));
          });

          setDocPipWindow(pip);
          setPlayerData((prev) => ({ ...prev, isPiPActive: true }));
        } catch (err) {
          console.error("Failed to open Document PiP", err);
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = (canvas as any).captureStream(10);
      videoRef.current = video;

      video.addEventListener("enterpictureinpicture", () => {
        setPlayerData((prev) => ({ ...prev, isPiPActive: true }));
      });
      video.addEventListener("leavepictureinpicture", () => {
        setPlayerData((prev) => ({ ...prev, isPiPActive: false }));
      });
      video.addEventListener("play", () => {
        trackEvent("Timer Started", { source: "video_pip_controls" });
        setPlayerData((prev) => ({ ...prev, isTimerRunning: true }));
      });
      video.addEventListener("pause", () => {
        trackEvent("Timer Paused", { source: "video_pip_controls" });
        setPlayerData((prev) => ({ ...prev, isTimerRunning: false }));
      });
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.play();
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Failed to toggle Fallback Video PiP", err);
    }
  };

  const handleMiniTimerClick = () => {
    trackEvent("Mini Timer Clicked", {
      mode: playerData.timerMode,
      remainingSeconds: playerData.timerSecondsRemaining,
    });
    setPlayerData((prev) => ({
      ...prev,
      activeTab: "timer",
    }));
    dispatch({ type: "SET_SHOW_INFO", payload: true });
  };

  useEffect(() => {
    setSongsData((prev) => ({
      ...prev,
      songs: defaultSongs,
      isLoading: false,
    }));

    if (!playerData.activeSong) {
      setPlayerData((prev) => ({
        ...prev,
        activeSong: defaultSongs[0].id,
      }));
    }

    window.oncontextmenu = () => {
      dispatch({ type: "SET_SHOW_INFO", payload: true });
    };

    if (window.location.pathname.includes("ecash")) {
      dispatch({
        type: "SET_SHOW_CASHTAB",
        payload: true,
      });
    }
  }, []);

  useEffect(() => {
    let timerId: any;
    if (player) {
      timerId = setInterval(() => {
        dispatch({
          type: "SET_VIDEO_META",
          payload: {
            duration: player.getDuration ? player.getDuration() : 0,
            current: player.getCurrentTime ? player.getCurrentTime() : 0,
          },
        });
      }, 1000);
      (window as any).player = player;
    }
    return () => clearInterval(timerId);
  }, [player]);

  // Синхронизация клика по фону (анимации)
  useEffect(() => {
    const handler = () => {
      if (!playerData.isPlaying && player?.playVideo) {
        player.playVideo();
      }
    };

    window.addEventListener("click", handler);

    return () => {
      window.removeEventListener("click", handler);
    };
  }, [player, playerData.isPlaying]);

  const onPlayPauseClick = () => {
    setPlayerData((prev) => {
      // Запускаем/ставим на паузу фоновое видео (анимацию), если оно есть
      if (player && typeof player.playVideo === "function") {
        if (!prev.isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  };

  const onPlayListClick = () => {
    setPlayerData((prev) => ({ ...prev, showSongsList: !prev.showSongsList }));
    dispatch({
      type: "SET_SHOW_CASHTAB",
      payload: false,
    });
  };

  const handleInfoClick = () => {
    setPlayerData((prev) => ({ ...prev, showSongsList: false }));
    dispatch({
      type: "SET_SHOW_CASHTAB",
      payload: false,
    });
  };

  // ИСПРАВЛЕНО: Поиск следующего/предыдущего трека теперь идет по ID, а не по URL
  const handlePrevClick = () => {
    const currIndex = defaultSongs.findIndex((s) => s.id === activeSong);
    const newIndex = currIndex <= 0 ? defaultSongs.length - 1 : currIndex - 1;
    const nextSongId = defaultSongs[newIndex].id;

    setPlayerData((prev) => ({
      ...prev,
      activeSong: nextSongId,
      isPlaying: true,
    }));
    window.localStorage.setItem("activeSong", nextSongId);
  };

  const handleNextClick = () => {
    const currIndex = defaultSongs.findIndex((s) => s.id === activeSong);
    const newIndex = currIndex >= defaultSongs.length - 1 ? 0 : currIndex + 1;
    const nextSongId = defaultSongs[newIndex].id;

    setPlayerData((prev) => ({
      ...prev,
      activeSong: nextSongId,
      isPlaying: true,
    }));
    window.localStorage.setItem("activeSong", nextSongId);
  };

  const handleEcashClick = () => {
    dispatch({ type: "SET_SHOW_INFO", payload: false });
    dispatch({ type: "SET_SHOW_CASHTAB", payload: true });
  };

  const handleVolumeChange = (e: any) => {
    const newVol = parseInt(e.target.value);
    setPlayerData((prev) => ({
      ...prev,
      volume: newVol,
    }));
    window.localStorage.setItem("volume", JSON.stringify(newVol));
  };

  const handleProgressChange = (e: any) => {
    const target = e.target as any;
    const val = parseInt(target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentDuration(val);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={songMeta?.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {isCashtabVisible && (
        <Cashtab
          onClose={() => dispatch({ type: "SET_SHOW_CASHTAB", payload: false })}
        />
      )}
      <Popover.Root
        open={isInfoVisible}
        onOpenChange={(open) => {
          dispatch({ type: "SET_SHOW_INFO", payload: open });
          if (open) {
            trackEvent("Open Info Panel", {
              activeTab: playerData.activeTab || "background",
            });
          }
        }}
      >
        <Popover.PopoverPortal>
          <Popover.PopoverContent
            align="center"
            side="top"
            sideOffset={10}
            style={{
              zIndex: 100,
              outline: 'none',
              width: '290px',
              maxHeight: '230px',
              overflowY: 'auto'
            }}
          >
            <PlayerInfo
              onEcashClick={handleEcashClick}
              player={player}
              infoRef={infoRef}
              handleTogglePiP={handleTogglePiP}
            />
          </Popover.PopoverContent>
        </Popover.PopoverPortal>

        <Controls
          title={title}
          author={author}
          volume={volume}
          isPlaying={isPlaying}
          onPlayPauseClick={onPlayPauseClick}
          onVolumeChange={handleVolumeChange}
          onPrevClick={handlePrevClick}
          onNextClick={handleNextClick}
          onPlayListClick={onPlayListClick}
          onProgressChange={handleProgressChange}
          duration={totalDuration}
          currentDuration={currentDuration}
          onInfoClick={handleInfoClick}
          isInfoVisible={isInfoVisible}
          onMiniTimerClick={handleMiniTimerClick}
        />
      </Popover.Root>

      <canvas
        ref={canvasRef}
        width="800"
        height="400"
        style={{ display: "none" }}
      />

      {docPipWindow && createPortal(
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div className="timer-container" style={{ padding: '0', gap: '8px', alignItems: 'center' }}>
            <div className="timer-status break-label" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary_color)', fontWeight: 700, marginBottom: '2px' }}>
              {playerData.timerMode === "work" ? "Focus" : "Break"}
            </div>
            <div className={`timer-display ${playerData.timerSecondsRemaining === 0 ? "blinking" : ""}`} style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>{timeStr}</div>
            <div className="timer-controls">
              <button onClick={handleStartPause} className="btn" style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.12)' }}>
                {playerData.isTimerRunning ? <PauseIcon /> : <PlayIcon />}
                <span>{playerData.isTimerRunning ? "Pause" : "Start"}</span>
              </button>
              <button onClick={resetTimer} className="btn" style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.12)' }}>
                <span>↺ Reset</span>
              </button>
            </div>
          </div>
        </div>,
        docPipWindow.document.body
      )}
    </div>
  );
}

export default Player;