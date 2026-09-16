import { useState } from 'react';

export default function VibeWidget() {
  const [showVibe, setShowVibe] = useState(false);

  return (
    <>
      {/* Кнопка включения/выключения вайба */}
      <button
        onClick={() => setShowVibe(!showVibe)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 100000,
          padding: '10px 20px',
          borderRadius: '8px',
          background: '#8a2be2',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        {showVibe ? 'Выключить Вайб' : 'Включить Вайб 🎧'}
      </button>

      {/* Сам виджет плеера */}
      {showVibe && (
        <iframe
          /* Пока тестируешь локально, путь будет localhost. 
             Потом заменишь на ссылку, куда задеплоишь lofi-fm */
          src="http://localhost:5173" 
          allow="autoplay" /* Критично важно для автовоспроизведения музыки */
          style={{
            position: 'fixed',
            bottom: '70px', /* Размещаем чуть выше кнопки */
            right: '20px',
            width: '340px',
            height: '500px',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 99999,
            backgroundColor: 'transparent', /* Прозрачный фон для скругленных углов */
            colorScheme: 'normal'
          }}
        />
      )}
    </>
  );
}