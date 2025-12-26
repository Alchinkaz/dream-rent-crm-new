import React from 'react';
import { PageProps } from '../../types';

export const Dashboard: React.FC<PageProps> = ({ currentCompany }) => {
  return (
    <div className="h-full overflow-y-auto p-8 max-w-7xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
         <h2 className="text-2xl font-bold text-slate-800">Главная</h2>
         <p className="text-slate-500 mt-1">Добро пожаловать в {currentCompany.name}.</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-slate-400 font-medium">Здесь пока ничего нет</p>
      </div>
    </div>
  );
};