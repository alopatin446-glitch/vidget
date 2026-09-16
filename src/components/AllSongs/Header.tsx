import { ReactComponent as CloseIcon } from "../../icons/close-icon.svg";

export type HeaderOptionType = "starred" | "allsongs";

export type HeaderProps = {
  setActiveOption(option: HeaderOptionType): void;
  activeOption: HeaderOptionType;
  onClose(): void;
};

function Header({ setActiveOption, activeOption, onClose }: HeaderProps) {
  return (
    <div className="header">
      <div className="options">
        <button
          onClick={() => setActiveOption("starred")}
          className={`btn ${activeOption === "starred" ? "active" : ""}`}
        >
          Избранное
        </button>
        <button
          onClick={() => setActiveOption("allsongs")}
          className={`btn ${activeOption === "allsongs" ? "active" : ""}`}
        >
          Все треки
        </button>
      </div>
      <div className="close">
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Блокируем лишние клики
            onClose();
          }} 
          title="Закрыть" 
          aria-label="Закрыть"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

export default Header;