import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import type { Reward } from '../types';

export default function MotivationalCard() {
  const [reward, setReward] = useState<Reward | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadRandomReward();
  }, []);

  const loadRandomReward = async () => {
    try {
      const data = await api.rewards.getRandom();
      if (data) {
        setReward(data);
        // Solo mostrar si no se cerró hoy
        const closedToday = localStorage.getItem('motivational-card-closed');
        const today = new Date().toDateString();
        if (closedToday !== today) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error cargando premio:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Guardar que se cerró hoy
    localStorage.setItem('motivational-card-closed', new Date().toDateString());
  };

  if (!isVisible || !reward) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-orange-400 rounded-xl p-6 shadow-2xl max-w-sm relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="text-6xl">{reward.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <h3 className="text-lg font-bold text-white">¡Puedes Ganar!</h3>
            </div>
            <p className="text-xl font-bold text-white mb-2">{reward.title}</p>
            <p className="text-sm text-orange-50">{reward.description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-orange-400">
          <p className="text-xs text-orange-100 text-center">
            💪 ¡Cumple tus objetivos y gana este premio!
          </p>
        </div>
      </div>
    </div>
  );
}
