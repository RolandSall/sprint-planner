import { Link } from 'react-router-dom';
import type { FeatureProjection } from '@org/shared-types';
import { featureBadgeStyle, resolveFeatureHex } from '../../lib/colors';

export function FeatureLegend({
  features,
  piId,
  deliverySprintMap,
  hiddenFeatureIds,
  onToggleFeature,
}: {
  features: FeatureProjection[];
  piId: string;
  deliverySprintMap?: Map<string, string>;
  hiddenFeatureIds?: Set<string>;
  onToggleFeature?: (featureId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3 bg-surface border border-border rounded-lg">
      {features.map(f => {
        const deliverySprint = deliverySprintMap?.get(f.id);
        const hexColor = resolveFeatureHex(f.id, f.color);
        const isHidden = hiddenFeatureIds?.has(f.id) ?? false;
        return (
          <div key={f.id} className="flex items-center gap-0">
            {onToggleFeature && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFeature(f.id); }}
                className="px-1.5 py-1 rounded-l border border-r-0 text-xs transition-opacity hover:opacity-70"
                style={featureBadgeStyle(hexColor)}
                title={isHidden ? 'Show feature' : 'Hide feature'}
              >
                {isHidden ? '👁‍🗨' : '👁'}
              </button>
            )}
            <Link
              to={`/pi/${piId}/features/${f.id}`}
              className={`flex items-center gap-1.5 px-2 py-1 border text-xs font-medium transition-opacity hover:opacity-80 ${
                onToggleFeature ? 'rounded-r' : 'rounded'
              } ${isHidden ? 'opacity-40' : ''}`}
              style={featureBadgeStyle(hexColor)}
            >
              <span>{f.externalId}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{f.title}</span>
              <span style={{ opacity: 0.6 }}>({f.totalEstimation} SP)</span>
              {deliverySprint && (
                <span className="ml-0.5 bg-green-600 text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none">
                  ✓ {deliverySprint}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
