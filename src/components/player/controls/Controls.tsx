import Slider from "../../Slider";
import { ReactComponent as PlayIcon } from "../../../icons/play-icon.svg";
import { ReactComponent as PauseIcon } from "../../../icons/pause-icon.svg";
import { ReactComponent as SoundIcon } from "../../../icons/sound-icon.svg";
import { ReactComponent as SongsIcon } from "../../../icons/songs-icon.svg";
import { ReactComponent as InfoIcon } from "../../../icons/info-icon.svg";
import { ReactComponent as NextIcon } from "../../../icons/next-icon.svg";
import "./controls-styles.css";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { useRecoilState } from "recoil";
import { PlayerState } from "../../../recoil/atoms/PlayerState";
import IconButton from "../../common/IconButton";

export type ControlsPropsType = {
  title: string;
  author: string;
  onPlayListClick(): void;
  onPrevClick(): void;
  onPlayPauseClick(): void;
  isPlaying: boolean;
  onNextClick(): void;
  volume: number;
  onVolumeChange: React.FormEventHandler<HTMLInputElement>;
  currentDuration: number;
  duration: number;
  onProgressChange: React.FormEventHandler<HTMLInputElement>;
  onInfoClick(): void;
  isInfoVisible: boolean;
  onMiniTimerClick(): void;
};

function Controls({
  title = "",
  author = "",
  onPlayListClick,
  onPrevClick,
  onPlayPauseClick,
  isPlaying,
  onNextClick,
  volume = 70,
  onVolumeChange,
  currentDuration,
  duration,
  onProgressChange,
  onInfoClick,
  isInfoVisible,
  onMiniTimerClick,
}: ControlsPropsType) {
  const [playerData] = useRecoilState(PlayerState);

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isWorkMode = playerData.timerMode === "work";
  const initialSeconds = isWorkMode
    ? playerData.timerWorkTime * 60
    : playerData.timerBreakTime * 60;
  const hasProgress = playerData.timerSecondsRemaining < initialSeconds;
  const showMiniTimer = !isInfoVisible && (playerData.isTimerRunning || hasProgress);

  return (
    <section
      className={`controls ${showMiniTimer ? "has-timer" : ""}`}
      aria-label="Панель управления воспроизведением"
      style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        margin: '0 auto',
      }}
    >
      <div className="top-section">
        <div className="title">
          <div className="author">{author}</div>
          <div className="name">{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
          {showMiniTimer && (
            <div
              className="mini-timer"
              onClick={onMiniTimerClick}
              title="Открыть таймер фокуса"
              aria-label="Таймер фокуса"
            >
              ⏱️ {formatTime(playerData.timerSecondsRemaining)}
            </div>
          )}
        </div>
      </div>
      
      <div className="progress">
        <div className="slidecontainer">
          <Slider
            min={0}
            max={duration || 100}
            className="slider"
            value={currentDuration || 0}
            id="myRange"
            onInput={onProgressChange}
            background="rgb(24 24 24 / 36%)"
            aria-label="Прогресс воспроизведения"
          />
        </div>
        <div className="time-indicators" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
          <span>{formatTime(currentDuration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="primary-controls">
        <div className="main">
          <div className="music-actions">
            <IconButton
              onClick={onPrevClick}
              className="prev"
              icon={<NextIcon />}
              title="Предыдущий трек"
              aria-label="Предыдущий трек"
            />
            <IconButton
              onClick={onPlayPauseClick}
              className="play-pause"
              icon={isPlaying ? <PauseIcon /> : <PlayIcon className="play" />}
              title={isPlaying ? "Пауза" : "Воспроизведение"}
              aria-label={isPlaying ? "Пауза" : "Воспроизведение"}
            />
            <IconButton
              onClick={onNextClick}
              className="next"
              icon={<NextIcon />}
              title="Следующий трек"
              aria-label="Следующий трек"
            />
            <div className="volume" title="Громкость">
              <SoundIcon aria-hidden="true" />
              <Slider
                min={0}
                max={100}
                className="slider"
                value={volume}
                id="myRange"
                onInput={onVolumeChange}
                color="var(--secondary_color)"
                background="rgb(24 24 24 / 10%)"
                orientation="horizontal"
                varient="small"
                aria-label="Регулировка громкости"
              />
            </div>
          </div>
          
          <div className="secondary-actions">
            <IconButton
              onClick={onPlayListClick}
              icon={<SongsIcon />}
              title="Плейлист"
              aria-label="Плейлист"
            />
            <PopoverTrigger asChild>
              <IconButton
                onClick={onInfoClick}
                icon={<InfoIcon style={{ paddingLeft: 0 }} />}
                title="Настройки и таймер"
                aria-label="Настройки и таймер"
              />
            </PopoverTrigger>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Controls;