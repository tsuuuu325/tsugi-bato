import { Link } from 'react-router-dom';
import type { Layer } from '@/types';
import { getContributorSummaries } from '@/types';
import { buildContributorPath } from '@/lib/contributorProfile';

interface ContributorLinksProps {
  layers: Layer[];
  className?: string;
  separator?: string;
  inline?: boolean;
}

export function ContributorLinks({
  layers,
  className,
  separator = ' · ',
  inline = false,
}: ContributorLinksProps) {
  const summaries = getContributorSummaries(layers);
  if (summaries.length === 0) return null;

  const Tag = inline ? 'span' : 'p';

  return (
    <Tag className={className}>
      {summaries.map((contributor, index) => (
        <span key={contributor.id}>
          {index > 0 && separator}
          <Link to={buildContributorPath(contributor.id)} className="contributor-link">
            {contributor.name}
          </Link>
        </span>
      ))}
    </Tag>
  );
}
