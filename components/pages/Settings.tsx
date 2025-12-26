import React from 'react';
import { PageProps } from '../../types';

export const Settings: React.FC<PageProps> = () => {
  return (
    <div className="h-full overflow-y-auto p-8 max-w-7xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
         <h2 className="text-2xl font-bold text-slate-800">Общие настройки</h2>
         <p className="text-slate-500 mt-1">Управление глобальными параметрами платформы Dream Rent.</p>
      </div>

      {/* Empty State / Placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex items-center justify-center">
        <p className="text-slate-400 font-medium">Страница настроек пока пуста</p>
      </div>
    </div>
  );
};