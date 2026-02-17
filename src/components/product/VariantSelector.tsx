'use client';

import { useState, useMemo } from 'react';
import { formatPrice } from '@/lib/utils';

interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorCode: string | null;
  price: number;
  availableStock: number;
  isActive: boolean;
}

interface VariantSelectorProps {
  variants: Variant[];
  basePrice: number;
  onVariantSelect: (variant: Variant | null) => void;
}

export default function VariantSelector({ variants, onVariantSelect }: VariantSelectorProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const colors = useMemo(() => {
    const colorMap = new Map<string, { name: string; code: string | null }>();
    for (const v of variants) {
      if (!colorMap.has(v.color)) {
        colorMap.set(v.color, { name: v.color, code: v.colorCode });
      }
    }
    return [...colorMap.values()];
  }, [variants]);

  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    for (const v of variants) {
      if (!selectedColor || v.color === selectedColor) {
        sizeSet.add(v.size);
      }
    }
    return [...sizeSet];
  }, [variants, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null;
  }, [variants, selectedColor, selectedSize]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setSelectedSize(null);
    onVariantSelect(null);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    const variant = variants.find((v) => v.color === selectedColor && v.size === size) ?? null;
    onVariantSelect(variant);
  };

  const getSizeStock = (size: string) => {
    if (!selectedColor) return 0;
    const variant = variants.find((v) => v.color === selectedColor && v.size === size);
    return variant?.availableStock ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* Color Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">
            컬러 {selectedColor && <span className="text-gray-500 font-normal">- {selectedColor}</span>}
          </h4>
        </div>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorSelect(color.name)}
              className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                selectedColor === color.name
                  ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: color.code ?? '#ccc' }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">
            사이즈 {selectedSize && <span className="text-gray-500 font-normal">- {selectedSize}</span>}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const stock = getSizeStock(size);
            const isDisabled = selectedColor !== null && stock <= 0;
            return (
              <button
                key={size}
                onClick={() => !isDisabled && handleSizeSelect(size)}
                disabled={isDisabled}
                className={`min-w-[48px] px-4 py-2.5 text-sm rounded border transition-all ${
                  selectedSize === size
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : isDisabled
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50 line-through'
                      : 'border-gray-300 text-gray-700 hover:border-gray-900'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        {!selectedColor && (
          <p className="text-xs text-gray-400 mt-2">컬러를 먼저 선택해주세요.</p>
        )}
      </div>

      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {selectedVariant.color} / {selectedVariant.size}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedVariant.availableStock > 0
                  ? `재고 ${selectedVariant.availableStock}개`
                  : '품절'}
              </p>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(selectedVariant.price)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
