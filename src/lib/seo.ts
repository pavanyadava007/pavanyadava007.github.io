import { site } from './site';

export interface SeoInput {
  title?: string;
  description?: string;
  path: string;
  /** Absolute or root-relative image URL for OG/Twitter cards. */
  image?: string;
  type?: 'website' | 'article';
}

export function resolveSeo(input: SeoInput) {
  const canonical = new URL(input.path, site.url).href;
  return {
    title: input.title ? `${input.title} - ${site.name}` : site.title,
    description: input.description ?? site.description,
    canonical,
    image: new URL(input.image ?? '/og/index.png', site.url).href,
    type: input.type ?? 'website',
  };
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    url: site.url,
    email: `mailto:${site.email}`,
    jobTitle: 'Machine Learning Engineer - 3D Perception, Sensor Fusion & Edge Deployment',
    address: { '@type': 'PostalAddress', addressLocality: 'Nürnberg', addressCountry: 'DE' },
    knowsAbout: [...site.knowsAbout],
    sameAs: [site.social.github, site.social.linkedin, site.social.huggingface],
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Friedrich-Alexander-Universität Erlangen-Nürnberg' },
      { '@type': 'CollegeOrUniversity', name: 'The National Institute of Engineering, Mysuru' },
    ],
    worksFor: { '@type': 'Organization', name: 'AUMOVIO SE' },
  };
}

export function creativeWorkJsonLd(p: {
  title: string;
  description: string;
  path: string;
  code?: string;
  demo?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    description: p.description,
    url: new URL(p.path, site.url).href,
    author: { '@type': 'Person', name: site.name, url: site.url },
    ...(p.code ? { codeRepository: p.code } : {}),
    ...(p.demo ? { discussionUrl: undefined, sameAs: [p.demo] } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, site.url).href,
    })),
  };
}
