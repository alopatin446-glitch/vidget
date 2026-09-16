import { ReactComponent as StarIcon } from "../../../icons/star-icon.svg";
import { ReactComponent as StarFilledIcon } from "../../../icons/star-icon-filled.svg";
import { ReactComponent as DeleteIcon } from "../../../icons/delete-icon.svg";
import { defaultSongs } from "../../../constants/songs";

export type SongsProps = {
  songs: any[];
  onSongClick(songid: string): void;
  activeSongId?: string;
  starred: string[];
  addOrRemoveStar(songId: string, isAdding: boolean): void;
  onRemoveSong(songId: string): void;
};

function Songs({
  songs,
  onSongClick,
  activeSongId,
  addOrRemoveStar,
  starred = [],
  onRemoveSong,
}: SongsProps) {
  return (
    <div className="all-songs">
      {songs.map((song: any) => (
        <div
          onClick={() => onSongClick(song.id)}
          className={`song-item ${activeSongId === song.id ? "active" : ""}`}
          key={song.id}
        >
          {/* Аккуратная заглушка вместо сломанного превью с YouTube */}
          <div 
            className="thumbnail" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(255,255,255,0.05)', 
              fontSize: '24px' 
            }}
          >
            🎵
          </div>
          
          <div className="info">
            <div className="title">{song.title}</div>
            {/* Используем author из нашей новой базы вместо channelTitle */}
            <div className="channel">{song.author || song.channelTitle}</div>
          </div>
          
          <div className="options">
            {/* Проверяем, является ли песня базовой. Если нет — показываем кнопку удаления */}
            {!defaultSongs.some((defaultSong) => defaultSong.id === song.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSong(song.id);
                }}
                className="star-button"
                title="Удалить трек"
              >
                <DeleteIcon />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                addOrRemoveStar(song.id, !starred.includes(song.id));
              }}
              className="star-button"
              title={starred.includes(song.id) ? "Убрать из избранного" : "В избранное"}
            >
              {starred.includes(song.id) ? <StarFilledIcon /> : <StarIcon />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Songs;