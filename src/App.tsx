import { useEffect, useState } from "react";
import "./App.css";
import Player from "./components/player/Player";
import { extractColorsFromImage } from "./utils/colors";
import AllSongs from "./components/AllSongs";
import { useRecoilState } from "recoil";
import { PlayerState } from "./recoil/atoms/PlayerState";
import giphys from "./constants/giphys"; // Импортируем список гифок

function App() {
  const [playerData, setPlayerData] = useRecoilState(PlayerState);
  const [isTransparent, setIsTransparent] = useState(false);

  // Устанавливаем гифку по умолчанию при первой загрузке
  useEffect(() => {
    const savedBg = window.localStorage.getItem("bgImgUrl");
    if (!savedBg && !playerData.bgImgUrl && giphys.length > 0) {
      const defaultBg = `/gifs/${giphys[0].id}`;
      setPlayerData((prev) => ({ ...prev, bgImgUrl: defaultBg }));
      window.localStorage.setItem("bgImgUrl", defaultBg);
    }
  }, []);

  useEffect(() => {
    const updateColors = async () => {
      if (playerData.isCustomTheme || !playerData.bgImgUrl) {
        return;
      }

      try {
        const colors = await extractColorsFromImage(playerData.bgImgUrl);
        if (colors && colors.length >= 2) {
          const [primary, secondary] = colors;
          document.body.style.setProperty(
            "--primary_color",
            `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`
          );
          document.body.style.setProperty(
            "--secondary_color",
            `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`
          );
        }
      } catch (e) {
        console.error("Failed to extract colors", e);
      }
    };

    updateColors();
  }, [playerData.bgImgUrl, playerData.isCustomTheme]);

  return (
    <div className="App" unselectable="on">
      <div
        style={{
          backgroundImage: isTransparent ? "none" : `url(${playerData.bgImgUrl})`,
          backgroundColor: isTransparent ? "transparent" : (playerData.bgImgUrl ? "black" : "rgba(35, 20, 50, 0.95)"),
          backgroundSize: "cover", // Чтобы гифка заполняла весь квадрат
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
        className="player-content"
      >
        {playerData.showSongsList && (
          <AllSongs
            onSongClick={(songId) => {
              setPlayerData((prev) => ({
                ...prev,
                activeSong: songId,
              }));
              window.localStorage.setItem("activeSong", songId);
            }}
            activeSongId={playerData.activeSong}
            onClose={() =>
              setPlayerData((prev) => ({
                ...prev,
                showSongsList: false,
              }))
            }
          />
        )}

        <div className="text">
          {!playerData.isPlaying && "Нажмите Play, чтобы включить музыку 📻"}
        </div>

        <Player />

        {/* Кнопка прозрачности перенесена в самый низ под элементы управления */}
        <button
          onClick={() => setIsTransparent(!isTransparent)}
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.3)',
            color: 'rgba(255, 255, 255, 0.6)',
            border: 'none',
            borderRadius: '12px',
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(4px)'
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.color = 'white'; 
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'; 
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; 
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'; 
          }}
        >
          {isTransparent ? "Вернуть фон" : "Сделать прозрачным"}
        </button>
      </div>
    </div>
  );
}

export default App;