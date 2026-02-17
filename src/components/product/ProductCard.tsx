import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    primaryImage: { url: string; alt: string | null } | null;
    avgRating: number;
    reviewCount: number;
    category: { id: string; name: string };
    brand: { id: string; name: string } | null;
    availableSizes: string[];
    availableColors: { name: string; code: string | null }[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3">
        {product.primaryImage ? (
          <img
            src={product.primaryImage.url}
            alt={product.primaryImage.alt ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {product.brand && (
          <p className="text-xs text-gray-500">{product.brand.name}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm font-bold text-gray-900">
          {formatPrice(product.basePrice)}
        </p>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{product.avgRating.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
        )}

        {product.availableColors.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            {product.availableColors.slice(0, 5).map((color) => (
              <span
                key={color.name}
                className="w-3.5 h-3.5 rounded-full border border-gray-300"
                style={{ backgroundColor: color.code ?? '#ccc' }}
                title={color.name}
              />
            ))}
            {product.availableColors.length > 5 && (
              <span className="text-xs text-gray-400">
                +{product.availableColors.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
