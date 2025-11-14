import React from 'react';
import { FaTrash } from 'react-icons/fa';

interface ToolbarProps {
  onClearCanvas: () => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  activeColor: string;
  brushSize: number;
}

const colors = [
  '#EF4444', // red-500
  '#3B82F6', // blue-500
  '#22C55E', // green-500
  '#EAB308', // yellow-500
  '#000000', // black
  '#6B7280', // gray-500
  '#FFFFFF', // white
  '#A855F7', // purple-500
];

const Toolbar: React.FC<ToolbarProps> = ({ onClearCanvas, onColorChange, onBrushSizeChange, activeColor, brushSize }) => {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      {/* Color Palette */}
      <div className="flex items-center gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 ${
              activeColor === color
                ? 'border-white scale-110'
                : 'border-transparent hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
            title={`Barva ${color}`}
          />
        ))}
      </div>

      {/* Brush Size Slider */}
      <div className="flex items-center gap-3 flex-grow max-w-xs">
        <div
          className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
          title={`Velikost štětce: ${brushSize}`}
        >
          <div className="bg-white rounded-full" style={{ width: `${Math.max(2, brushSize / 2.5)}px`, height: `${Math.max(2, brushSize / 2.5)}px` }}></div>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Clear Canvas Button */}
      <button
        onClick={onClearCanvas}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
      >
        <FaTrash />
        <span>Smazat</span>
      </button>
    </div>
  );
};

export default Toolbar;