import type { ImageMetadata } from 'astro';
import langgraspLive from '~/assets/langgrasp-live.png';
import langgraspSafety from '~/assets/langgrasp-safety.png';
import mrsLive from '~/assets/mrs-live.png';
import mrsAsk from '~/assets/mrs-ask.png';
import sigintOverview from '~/assets/sigint-overview.png';
import sigintAnalyst from '~/assets/sigint-analyst.png';
import obfPoster from '~/assets/poster.jpg';

/**
 * Every bitmap that goes through astro:assets, keyed by the filename the content
 * collection refers to. Going through this map (rather than /public) is what gets
 * each image an AVIF/WebP srcset with explicit dimensions.
 */
export const IMAGES: Record<string, ImageMetadata> = {
  'langgrasp-live.png': langgraspLive,
  'langgrasp-safety.png': langgraspSafety,
  'mrs-live.png': mrsLive,
  'mrs-ask.png': mrsAsk,
  'sigint-overview.png': sigintOverview,
  'sigint-analyst.png': sigintAnalyst,
  'poster.jpg': obfPoster,
};

/** Alt text lives beside the image so no call site has to invent one. */
export const ALT: Record<string, string> = {
  'langgrasp-live.png':
    'LangGrasp Live Run view: the front camera with the chosen box and grasp marker drawn on it, the nine pipeline stages with their measured latencies, and the safety rail.',
  'langgrasp-safety.png':
    'LangGrasp Safety view: the hazard table with each mitigation, the code implementing it, the test that exercises it, and whether it was exercised or needs hardware that does not exist.',
  'mrs-live.png':
    'Makerspace Reuse Scanner live feed: YOLO11n detections over a WebSocket, with material class and bin route per item and the running inventory.',
  'mrs-ask.png':
    'Makerspace Reuse Scanner Ask page: a cited German answer from the local RAG assistant beside a live inventory snapshot.',
  'sigint-overview.png':
    'SIGINT-Fusion operator console: spectrum waterfall, electronic-order-of-battle bearing rose and live detections.',
  'sigint-analyst.png':
    'SIGINT-Fusion analyst page: a LangGraph agent identifying a 9400 MHz emitter from retrieved catalogue entries and saving a report.',
  'poster.jpg':
    'offroad-bevfusion showcase video poster frame: the ROS 2 node replaying a fused BEV scene in rviz2.',
};

export function image(name: string): ImageMetadata {
  const img = IMAGES[name];
  if (!img) throw new Error(`no image registered for "${name}" - add it to src/lib/media.ts`);
  return img;
}

export function alt(name: string): string {
  return ALT[name] ?? '';
}
