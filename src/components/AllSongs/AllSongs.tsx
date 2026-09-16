import { useState } from "react";
import "./all-songs-style.css";
import Songs from "./Songs/Songs";
import { useRecoilState } from "recoil";
import { SongsState } from "../../recoil/atoms/SongsState";
import Header from "./Header";

export type AllSongsProps = {
  onSongClick(songId: string): void;
  activeSongId?: string;
  onClose(): void;
};

function AllSongs({ onSongClick, activeSongId, onClose }: AllSongsProps) {
  const [songsData, setSongsData] = useRecoilState(SongsState);
  const [activeOption, setActiveOption] = useState<"allsongs" | "starred">("allsongs");

  const handleAddorRemoveStar = (songId: string, isAdding: boolean) => {
    setSongsData((prev: any) => {
      let newStarred = [];
      if (isAdding) {
        newStarred = [...prev.starredIds, songId];
      } else {
        newStarred = prev.starredIds.filter((sid: string) => sid !== songId);
      }
      // Обязательно сохраняем в localStorage, чтобы избранное не пропадало после обновления
      window.localStorage.setItem("starred", JSON.stringify(newStarred));
      return { ...prev, starredIds: newStarred };
    });
  };

  const handleRemove = (songId: string) => {
    setSongsData((prev: any) => ({
      ...prev,
      songs: prev.songs.filter((song: any) => song.id !== songId),
    }));
  };

  return (
    <div className="all-songs-container" onClick={(e) => e.stopPropagation()}>
      <Header
        setActiveOption={setActiveOption}
        activeOption={activeOption}
        onClose={onClose}
      />
      {activeOption === "allsongs" && (
        <Songs
          songs={songsData.songs}
          onSongClick={onSongClick}
          activeSongId={activeSongId}
          addOrRemoveStar={handleAddorRemoveStar}
          starred={songsData.starredIds}
          onRemoveSong={handleRemove}
        />
      )}

      {activeOption === "starred" && (
        <Songs
          songs={songsData.songs.filter((song: any) =>
            songsData.starredIds.includes(song.id)
          )}
          onSongClick={onSongClick}
          activeSongId={activeSongId}
          addOrRemoveStar={handleAddorRemoveStar}
          starred={songsData.starredIds}
          onRemoveSong={handleRemove}
        />
      )}
    </div>
  );
}

export default AllSongs;